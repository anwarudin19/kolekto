import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  SystemRole,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { AccountsService } from 'src/accounts/accounts.service';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { TeamsService } from 'src/teams/teams.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';

type ListResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly accountsService: AccountsService,
    private readonly uploadsService: UploadsService,
    private readonly queueService: QueueService,
    private readonly auditLogsService: AuditLogsService,
    private readonly licenseAccessService: LicenseAccessService,
  ) { }

  async submit(invoiceId: string, actorId: string, dto: CreatePaymentDto, file?: Express.Multer.File) {
    const invoice = await this.prisma.contributionInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    await this.teamsService.ensureActiveMembership(invoice.teamId, actorId);
    if (invoice.userId !== actorId) {
      throw new ForbiddenException('Anda hanya dapat mengirim pembayaran untuk tagihan milik sendiri');
    }

    const existingActivePayment = await this.prisma.contributionPayment.findFirst({
      where: {
        invoiceId,
        userId: actorId,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.APPROVED],
        },
      },
      select: { id: true, status: true },
    });

    if (existingActivePayment) {
      throw new ConflictException('Konfirmasi pembayaran sudah dikirim dan masih diproses');
    }

    await this.accountsService.assertTeamAccount(invoice.teamId, dto.accountId);

    let uploaded:
      | {
        storageKey: string;
        proofUrl: null;
        originalFileName: string;
        mimeType: string;
        fileSize: number;
      }
      | undefined;

    if (file) {
      uploaded = await this.uploadsService.uploadPaymentProof(file, invoice.teamId);
    }

    try {
      const payment = await this.prisma.contributionPayment.create({
        data: {
          invoiceId,
          teamId: invoice.teamId,
          userId: actorId,
          accountId: dto.accountId,
          amount: dto.amount,
          note: dto.note,
          status: PaymentStatus.PENDING,
          proofUrl: uploaded?.proofUrl,
          storageKey: uploaded?.storageKey,
          originalFileName: uploaded?.originalFileName,
          mimeType: uploaded?.mimeType,
          fileSize: uploaded?.fileSize,
        },
      });

      await this.auditLogsService.create({
        teamId: invoice.teamId,
        userId: actorId,
        action: 'PAYMENT_SUBMITTED',
        entityType: 'ContributionPayment',
        entityId: payment.id,
        description: `Pembayaran dikirim untuk tagihan ${invoice.invoiceCode}`,
        metadata: {
          amount: dto.amount,
        },
      });

      return payment;
    } catch (error) {
      if (uploaded?.storageKey) {
        await this.queueService.addFileCleanupJob(uploaded.storageKey).catch(() => undefined);
      }
      throw error;
    }
  }

  async list(teamId: string, actorId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    await this.teamsService.ensureActiveMembership(teamId, actorId);
    const pagination = buildPagination(query.page, query.limit);
    const statuses = query.status
      ?.split(',')
      .map((status) => status.trim())
      .filter((status): status is PaymentStatus => Object.values(PaymentStatus).includes(status as PaymentStatus));
    const where: Prisma.ContributionPaymentWhereInput = {
      teamId,
      ...(statuses?.length ? { status: { in: statuses } } : {}),
      ...(query.search
        ? {
          OR: [
            { user: { is: { fullName: { contains: query.search, mode: 'insensitive' } } } },
            { user: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
            { invoice: { is: { invoiceCode: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.contributionPayment.count({ where }),
      this.prisma.contributionPayment.findMany({
        where,
        include: {
          invoice: true,
          user: {
            select: { id: true, fullName: true, email: true },
          },
          account: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const paymentsWithUrls = await Promise.all(data.map(async (payment) => {
      let proofUrl = payment.proofUrl;
      if (!proofUrl && payment.storageKey) {
        try {
          proofUrl = await this.uploadsService.getSignedUrl(payment.storageKey);
        } catch (e) {
          // ignore error if failed to sign
        }
      }
      return { ...payment, proofUrl };
    }));

    return {
      data: paymentsWithUrls as Record<string, unknown>[],
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async approve(paymentId: string, actorId: string) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });
    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    const membership = await this.teamsService.ensureActiveMembership(payment.teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN && membership.systemRole !== SystemRole.TREASURER) {
      throw new ForbiddenException('Hanya pengurus (owner/admin/bendahara) yang dapat menyetujui pembayaran');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ForbiddenException('Hanya pembayaran berstatus pending yang dapat disetujui');
    }

    await this.licenseAccessService.ensureTeamWriteAllowed(payment.teamId);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.contributionPayment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.APPROVED,
          approvedById: actorId,
          approvedAt: new Date(),
          rejectedById: null,
          rejectedAt: null,
          rejectedReason: null,
        },
      });

      const approvedAggregate = await tx.contributionPayment.aggregate({
        where: {
          invoiceId: payment.invoiceId,
          status: PaymentStatus.APPROVED,
        },
        _sum: {
          amount: true,
        },
      });

      const approvedTotal = Number(approvedAggregate._sum.amount ?? 0);
      const invoiceStatus =
        approvedTotal >= Number(payment.invoice.amount) ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      const updatedInvoice = await tx.contributionInvoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: invoiceStatus,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          teamId: payment.teamId,
          accountId: payment.accountId,
          type: TransactionType.INCOME,
          source: TransactionSource.CONTRIBUTION,
          amount: payment.amount,
          description: `Pembayaran iuran disetujui untuk tagihan ${payment.invoice.invoiceCode}`,
          proofUrl: payment.proofUrl,
          storageKey: payment.storageKey,
          originalFileName: payment.originalFileName,
          mimeType: payment.mimeType,
          fileSize: payment.fileSize,
          referenceId: payment.id,
          createdBy: actorId,
        },
      });

      await tx.activityLog.create({
        data: {
          teamId: payment.teamId,
          userId: actorId,
          action: 'PAYMENT_APPROVED',
          entityType: 'ContributionPayment',
          entityId: payment.id,
          description: `Pembayaran disetujui untuk tagihan ${payment.invoice.invoiceCode}`,
          metadata: {
            transactionId: transaction.id,
            invoiceStatus: updatedInvoice.status,
            approvedTotal,
          },
        },
      });

      return {
        updatedPayment,
        invoiceStatus: updatedInvoice.status,
      };
    });

    await this.accountsService.clearBalanceCache(payment.teamId, payment.accountId);
    await this.queueService.addNotificationJob({
      userId: payment.userId,
      teamId: payment.teamId,
      type: 'PAYMENT_APPROVED',
      title: 'Pembayaran disetujui',
      message: `Pembayaran untuk tagihan ${payment.invoice.invoiceCode} telah disetujui`,
      data: {
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        invoiceStatus: result.invoiceStatus,
      },
    });

    return result.updatedPayment;
  }

  async reject(paymentId: string, actorId: string, dto: RejectPaymentDto) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });
    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    const membership = await this.teamsService.ensureActiveMembership(payment.teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN && membership.systemRole !== SystemRole.TREASURER) {
      throw new ForbiddenException('Hanya pengurus (owner/admin/bendahara) yang dapat menolak pembayaran');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ForbiddenException('Hanya pembayaran berstatus pending yang dapat ditolak');
    }

    await this.licenseAccessService.ensureTeamWriteAllowed(payment.teamId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.contributionPayment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REJECTED,
          rejectedById: actorId,
          rejectedAt: new Date(),
          rejectedReason: dto.rejectedReason,
          approvedById: null,
          approvedAt: null,
        },
      });

      await tx.activityLog.create({
        data: {
          teamId: payment.teamId,
          userId: actorId,
          action: 'PAYMENT_REJECTED',
          entityType: 'ContributionPayment',
          entityId: payment.id,
          description: `Pembayaran ditolak untuk tagihan ${payment.invoice.invoiceCode}`,
          metadata: {
            rejectedReason: dto.rejectedReason,
          },
        },
      });

      return updated;
    });

    await this.queueService.addNotificationJob({
      userId: payment.userId,
      teamId: payment.teamId,
      type: 'PAYMENT_REJECTED',
      title: 'Pembayaran ditolak',
      message: `Pembayaran untuk tagihan ${payment.invoice.invoiceCode} ditolak`,
      data: {
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        rejectedReason: dto.rejectedReason,
      },
    });

    return updated;
  }
}
