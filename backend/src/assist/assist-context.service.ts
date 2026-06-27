import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma, TransactionType } from '@prisma/client';
import { addMonthsUtc, startOfMonthUtc } from 'src/common/utils/date';
import { PrismaService } from 'src/prisma/prisma.service';
import type { AssistTeamAccess } from './assist-policy.service';

const OPEN_INVOICE_STATUSES = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.UNPAID,
  InvoiceStatus.PARTIAL,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.EXPIRED,
];

@Injectable()
export class AssistContextService {
  constructor(private readonly prisma: PrismaService) { }

  async getTeamSummary(access: AssistTeamAccess) {
    const range = this.currentMonthRange();
    const [memberCount, invoiceCounts, paymentCounts, monthlyTransactions, allTransactions] = await Promise.all([
      this.prisma.teamMember.count({
        where: {
          teamId: access.teamId,
          status: 'ACTIVE',
        },
      }),
      this.prisma.contributionInvoice.groupBy({
        by: ['status'],
        where: {
          teamId: access.teamId,
          periodDate: {
            gte: range.start,
            lt: range.end,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.contributionPayment.groupBy({
        by: ['status'],
        where: {
          teamId: access.teamId,
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
      this.sumTransactions(access.teamId, range),
      this.sumTransactions(access.teamId),
    ]);

    return {
      teamName: access.teamName,
      memberCount,
      invoiceCounts,
      paymentCounts,
      monthlyIncome: monthlyTransactions.income,
      monthlyExpense: monthlyTransactions.expense,
      monthlyNet: monthlyTransactions.income - monthlyTransactions.expense,
      balance: allTransactions.income - allTransactions.expense,
    };
  }

  async getOpenInvoices(access: AssistTeamAccess) {
    return this.prisma.contributionInvoice.findMany({
      where: {
        teamId: access.teamId,
        ...(access.isMember ? { userId: access.userId } : {}),
        status: { in: OPEN_INVOICE_STATUSES },
      },
      select: {
        id: true,
        invoiceCode: true,
        amount: true,
        status: true,
        dueDate: true,
        periodDate: true,
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: access.isMember ? 6 : 10,
    });
  }

  async getMyInvoices(access: AssistTeamAccess) {
    return this.prisma.contributionInvoice.findMany({
      where: {
        teamId: access.teamId,
        userId: access.userId,
      },
      select: {
        id: true,
        invoiceCode: true,
        amount: true,
        status: true,
        dueDate: true,
        periodDate: true,
        role: {
          select: {
            name: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
      },
      orderBy: [{ periodDate: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    });
  }

  async getExpenseSummary(access: AssistTeamAccess) {
    const range = this.currentMonthRange();
    const [total, latest] = await Promise.all([
      this.sumTransactions(access.teamId, range, TransactionType.EXPENSE),
      this.prisma.transaction.findMany({
        where: {
          teamId: access.teamId,
          type: TransactionType.EXPENSE,
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
        },
        select: {
          id: true,
          amount: true,
          description: true,
          createdAt: true,
          account: {
            select: {
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      total: total.expense,
      latest,
    };
  }

  async getIncomeSummary(access: AssistTeamAccess) {
    const range = this.currentMonthRange();
    const [transactions, approvedPayments] = await Promise.all([
      this.sumTransactions(access.teamId, range, TransactionType.INCOME),
      this.prisma.contributionPayment.aggregate({
        where: {
          teamId: access.teamId,
          status: PaymentStatus.APPROVED,
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      total: transactions.income,
      approvedPaymentTotal: Number(approvedPayments._sum.amount ?? 0),
      approvedPaymentCount: approvedPayments._count._all,
    };
  }

  async getBalance(access: AssistTeamAccess) {
    return this.sumTransactions(access.teamId);
  }

  private currentMonthRange() {
    const start = startOfMonthUtc();
    return {
      start,
      end: addMonthsUtc(start, 1),
    };
  }

  private async sumTransactions(
    teamId: string,
    range?: { start: Date; end: Date },
    type?: TransactionType,
  ) {
    const where: Prisma.TransactionWhereInput = {
      teamId,
      ...(type ? { type } : {}),
      ...(range
        ? {
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
        }
        : {}),
    };

    const rows = await this.prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true,
      },
    });

    return rows.reduce(
      (totals, row) => ({
        income: totals.income + (row.type === TransactionType.INCOME ? Number(row._sum.amount ?? 0) : 0),
        expense: totals.expense + (row.type === TransactionType.EXPENSE ? Number(row._sum.amount ?? 0) : 0),
      }),
      { income: 0, expense: 0 },
    );
  }
}
