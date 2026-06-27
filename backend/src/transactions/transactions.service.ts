import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, TransactionSource, TransactionType } from '@prisma/client';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { AccountsService } from 'src/accounts/accounts.service';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { TeamsService } from 'src/teams/teams.service';
import { TransactionCategoriesService } from 'src/transaction-categories/transaction-categories.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

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
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly accountsService: AccountsService,
    private readonly queueService: QueueService,
    private readonly uploadsService: UploadsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly transactionCategoriesService: TransactionCategoriesService,
  ) { }

  async list(teamId: string, actorId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    await this.teamsService.ensureActiveMembership(teamId, actorId);
    const pagination = buildPagination(query.page, query.limit);
    const where: Prisma.TransactionWhereInput = {
      teamId,
      ...(query.search
        ? {
          OR: [
            { description: { contains: query.search, mode: 'insensitive' } },
            { account: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
            { creator: { is: { fullName: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: {
          account: true,
          category: true,
          creator: {
            select: { id: true, fullName: true, email: true },
          },
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      data: data as Record<string, unknown>[],
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async createExpense(
    teamId: string,
    actorId: string,
    dto: CreateExpenseDto,
    files?: Express.Multer.File[],
  ) {
    const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);

    const ALLOWED: SystemRole[] = [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.TREASURER];
    const hasMembershipRole = ALLOWED.includes(membership.systemRole);

    if (!hasMembershipRole) {
      // Fallback: check global user role (OWNER/ADMIN/TREASURER at system level may manage any team)
      const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
      const hasGlobalRole = user && ALLOWED.includes(user.role);
      if (!hasGlobalRole) {
        throw new ForbiddenException('Hanya owner, admin, atau bendahara yang dapat membuat pengeluaran');
      }
    }

    await this.accountsService.assertTeamAccount(teamId, dto.accountId);

    if (dto.categoryId) {
      await this.transactionCategoriesService.assertCategoryBelongsToTeam(teamId, dto.categoryId);
    }

    const uploadedKeys: string[] = [];

    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          teamId,
          accountId: dto.accountId,
          categoryId: dto.categoryId ?? null,
          type: TransactionType.EXPENSE,
          source: TransactionSource.MANUAL_EXPENSE,
          amount: dto.amount,
          description: dto.description,
          createdBy: actorId,
        },
      });

      if (files?.length) {
        for (const file of files) {
          const uploaded = await this.uploadsService.uploadExpenseProof(file, teamId);
          uploadedKeys.push(uploaded.storageKey);
          await this.prisma.transactionAttachment.create({
            data: {
              transactionId: transaction.id,
              storageKey: uploaded.storageKey,
              originalFileName: uploaded.originalFileName,
              mimeType: uploaded.mimeType,
              fileSize: uploaded.fileSize,
            },
          });
        }
      }

      await this.auditLogsService.create({
        teamId,
        userId: actorId,
        action: 'EXPENSE_CREATED',
        entityType: 'Transaction',
        entityId: transaction.id,
        description: `Expense transaction created`,
        metadata: {
          amount: dto.amount,
          accountId: dto.accountId,
          attachmentCount: files?.length ?? 0,
        },
      });

      await this.accountsService.clearBalanceCache(teamId, dto.accountId);
      return transaction;
    } catch (error) {
      for (const key of uploadedKeys) {
        await this.queueService.addFileCleanupJob(key).catch(() => undefined);
      }
      throw error;
    }
  }

  async findOne(transactionId: string, actorId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        account: true,
        category: true,
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        attachments: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    await this.teamsService.ensureActiveMembership(transaction.teamId, actorId);
    return transaction;
  }

  async getProofUrls(transactionId: string, actorId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { attachments: true },
    });
    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    await this.teamsService.ensureActiveMembership(transaction.teamId, actorId);

    const attachments = await Promise.all(
      transaction.attachments.map(async (att) => ({
        id: att.id,
        originalFileName: att.originalFileName,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        url: await this.uploadsService.getSignedUrl(att.storageKey),
      })),
    );

    return { transactionId, attachments, expiresInSeconds: 900 };
  }

  async getProofUrl(transactionId: string, actorId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { attachments: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    await this.teamsService.ensureActiveMembership(transaction.teamId, actorId);

    const storageKey = transaction.attachments[0]?.storageKey ?? transaction.storageKey;
    if (!storageKey) {
      throw new NotFoundException('File bukti tidak ditemukan');
    }

    return {
      transactionId,
      url: await this.uploadsService.getSignedUrl(storageKey),
      expiresInSeconds: 900,
    };
  }
}
