import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole, TransactionType } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CACHE_TTL, cacheKeys } from 'src/queue/queue.constants';
import { TeamsService } from 'src/teams/teams.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly cacheService: CacheService,
  ) { }

  async list(teamId: string) {
    const [accounts, aggregates] = await Promise.all([
      this.prisma.account.findMany({
        where: { teamId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: { teamId },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const balanceByAccount = new Map<string, number>();
    for (const item of aggregates) {
      const currentBalance = balanceByAccount.get(item.accountId) ?? 0;
      const amount = Number(item._sum.amount ?? 0);
      balanceByAccount.set(
        item.accountId,
        item.type === TransactionType.INCOME ? currentBalance + amount : currentBalance - amount,
      );
    }

    return accounts.map((account) => ({
      ...account,
      balance: balanceByAccount.get(account.id) ?? 0,
    }));
  }

  async create(teamId: string, actorId: string, dto: CreateAccountDto) {
    await this.ensureAdminPrivileges(teamId, actorId);

    const account = await this.prisma.account.create({
      data: {
        teamId,
        ...dto,
      },
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'ACCOUNT_CREATED',
      entityType: 'Account',
      entityId: account.id,
      description: `Account ${account.name} created`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return account;
  }

  async update(teamId: string, accountId: string, actorId: string, dto: UpdateAccountDto) {
    await this.ensureAdminPrivileges(teamId, actorId);

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.teamId !== teamId) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: dto,
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'ACCOUNT_UPDATED',
      entityType: 'Account',
      entityId: updated.id,
      description: `Account ${updated.name} updated`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async getBalance(teamId: string, accountId: string) {
    return this.cacheService.remember(
      cacheKeys.accountBalance(teamId, accountId),
      CACHE_TTL.ACCOUNT_BALANCE,
      async () => {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account || account.teamId !== teamId) {
          throw new NotFoundException('Akun tidak ditemukan');
        }

        const aggregates = await this.prisma.transaction.groupBy({
          by: ['type'],
          where: {
            teamId,
            accountId,
          },
          _sum: {
            amount: true,
          },
        });

        const balance = aggregates.reduce((sum, item) => {
          const amount = Number(item._sum.amount ?? 0);
          return item.type === TransactionType.INCOME ? sum + amount : sum - amount;
        }, 0);

        return {
          accountId,
          balance,
          currency: 'IDR',
        };
      },
    );
  }

  async assertTeamAccount(teamId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.teamId !== teamId) {
      throw new NotFoundException('Akun tidak ditemukan');
    }

    return account;
  }

  async clearBalanceCache(teamId: string, accountId: string): Promise<void> {
    await this.cacheService.del(cacheKeys.accountBalance(teamId, accountId));
  }

  private async ensureAdminPrivileges(teamId: string, actorId: string) {
    const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat mengelola akun');
    }
  }
}
