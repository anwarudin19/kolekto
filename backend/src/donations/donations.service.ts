import { Injectable } from '@nestjs/common';
import { Prisma, TransactionSource, TransactionType } from '@prisma/client';
import { AccountsService } from 'src/accounts/accounts.service';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { TeamsService } from 'src/teams/teams.service';
import { CreateDonationDto } from './dto/create-donation.dto';

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
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly accountsService: AccountsService,
    private readonly queueService: QueueService,
    private readonly auditLogsService: AuditLogsService,
  ) { }

  async create(teamId: string, actorId: string, dto: CreateDonationDto) {
    await this.teamsService.ensureActiveMembership(teamId, actorId);
    await this.accountsService.assertTeamAccount(teamId, dto.accountId);
    const donorName = dto.isAnonymous ? null : dto.donorName?.trim() || null;

    const donation = await this.prisma.$transaction(async (tx) => {
      const donationData = {
        teamId,
        userId: actorId,
        accountId: dto.accountId,
        amount: dto.amount,
        isAnonymous: dto.isAnonymous ?? false,
        donorName,
        note: dto.note,
      } as unknown as Prisma.DonationUncheckedCreateInput;

      const donation = await tx.donation.create({
        data: donationData,
      });

      await tx.transaction.create({
        data: {
          teamId,
          accountId: dto.accountId,
          type: TransactionType.INCOME,
          source: TransactionSource.DONATION,
          amount: dto.amount,
          description: dto.note ?? 'Donation received',
          referenceId: donation.id,
          createdBy: actorId,
        },
      });

      await tx.activityLog.create({
        data: {
          teamId,
          userId: actorId,
          action: 'DONATION_CREATED',
          entityType: 'Donation',
          entityId: donation.id,
          description: `Donation submitted`,
          metadata: {
            amount: dto.amount,
            isAnonymous: dto.isAnonymous ?? false,
            donorName,
          },
        },
      });

      return donation;
    });

    await this.accountsService.clearBalanceCache(teamId, dto.accountId);
    await this.queueService.addNotificationJob({
      userId: actorId,
      teamId,
      type: 'DONATION_CREATED',
      title: 'Donasi tercatat',
      message: 'Donasi Anda berhasil dicatat ke kas tim.',
      data: {
        donationId: donation.id,
        amount: dto.amount,
        donorName,
      },
    });

    return donation;
  }

  async list(teamId: string, actorId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    await this.teamsService.ensureActiveMembership(teamId, actorId);
    const pagination = buildPagination(query.page, query.limit);
    const where = {
      teamId,
      ...(query.search
        ? {
          OR: [
            { note: { contains: query.search, mode: 'insensitive' } },
            { donorName: { contains: query.search, mode: 'insensitive' } },
            { user: { is: { fullName: { contains: query.search, mode: 'insensitive' } } } },
            { user: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
        : {}),
    } as Prisma.DonationWhereInput;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.donation.count({ where }),
      this.prisma.donation.findMany({
        where,
        include: {
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
}
