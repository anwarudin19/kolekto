import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EodMode,
  EodStatus,
  InvitationStatus,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  SystemRole,
  TeamMemberStatus,
  TeamStatus,
  TransactionSource,
  TransactionType,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { addMonthsUtc, startOfDayUtc, startOfMonthUtc } from 'src/common/utils/date';
import { buildTeamInvitationStyleCode } from 'src/common/utils/invite-code';
import { generateInvoiceCode } from 'src/common/utils/invoice-code';
import { buildPagination } from 'src/common/utils/pagination';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { AdminAccessService } from './admin-access.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { ApprovePaymentConfirmationDto } from './dto/approve-payment-confirmation.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RejectPaymentConfirmationDto } from './dto/reject-payment-confirmation.dto';
import { RunEodDto } from './dto/run-eod.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type ListResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    totalAmount?: number;
  };
};

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;
const OWNER_ROLE = 'OWNER' as SystemRole;
const ADMIN_ROLE = 'ADMIN' as SystemRole;
const TREASURER_ROLE = 'TREASURER' as SystemRole;
const MEMBER_ROLE = 'MEMBER' as SystemRole;
const ADMIN_TEAM_ROLES = [OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly accessService: AdminAccessService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly licenseAccessService: LicenseAccessService,
    private readonly uploadsService: UploadsService,
  ) { }

  async dashboard(userId: string, filterTeamId?: string) {
    const currentUser = await this.accessService.getCurrentUser(userId);
    const accessibleIds = currentUser.isSuperAdmin || currentUser.role === SUPER_ADMIN_ROLE
      ? (await this.prisma.team.findMany({ select: { id: true } })).map((team) => team.id)
      : await this.accessService.getAccessibleTeamIds(userId);

    let teamIds: string[];
    if (filterTeamId) {
      teamIds = accessibleIds.includes(filterTeamId) ? [filterTeamId] : [];
    } else {
      teamIds = accessibleIds;
    }

    const whereTeams = teamIds.length ? { teamId: { in: teamIds } } : undefined;

    const [
      activeMembers,
      totalMembers,
      totalTeams,
      totalActiveTeams,
      totalInvoices,
      paidInvoices,
      partialInvoices,
      unpaidInvoices,
      overdueInvoices,
      pendingApprovals,
      totalApprovedPayments,
      totalRejectedPayments,
      transactionTotals,
      latestEodRun,
    ] = await Promise.all([
      currentUser.isSuperAdmin || currentUser.role === SUPER_ADMIN_ROLE
        ? this.prisma.user.count()
        : this.prisma.teamMember
          .findMany({
            where: { teamId: { in: teamIds }, status: TeamMemberStatus.ACTIVE },
            distinct: ['userId'],
            select: { userId: true },
          })
          .then((rows) => rows.length),
      currentUser.isSuperAdmin || currentUser.role === SUPER_ADMIN_ROLE
        ? this.prisma.user.count()
        : teamIds.length
          ? this.prisma.teamMember
            .findMany({
              where: { teamId: { in: teamIds } },
              distinct: ['userId'],
              select: { userId: true },
            })
            .then((rows) => rows.length)
          : Promise.resolve(0),
      teamIds.length
        ? this.prisma.team.count({ where: { id: { in: teamIds } } })
        : Promise.resolve(0),
      teamIds.length
        ? this.prisma.team.count({
          where: { id: { in: teamIds }, status: TeamStatus.ACTIVE },
        })
        : Promise.resolve(0),
      whereTeams ? this.prisma.contributionInvoice.count({ where: whereTeams }) : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionInvoice.count({
          where: { ...whereTeams, status: InvoiceStatus.PAID },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionInvoice.count({
          where: { ...whereTeams, status: InvoiceStatus.PARTIAL },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionInvoice.count({
          where: { ...whereTeams, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] } },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionInvoice.count({
          where: { ...whereTeams, status: { in: [InvoiceStatus.OVERDUE, InvoiceStatus.EXPIRED] } },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionPayment.count({
          where: { ...whereTeams, status: PaymentStatus.PENDING },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionPayment.count({
          where: { ...whereTeams, status: PaymentStatus.APPROVED },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.contributionPayment.count({
          where: { ...whereTeams, status: PaymentStatus.REJECTED },
        })
        : Promise.resolve(0),
      whereTeams
        ? this.prisma.transaction
          .groupBy({
            by: ['type'],
            where: whereTeams,
            _sum: { amount: true },
          })
          .then((rows) =>
            rows.reduce(
              (sum, row) =>
                row.type === TransactionType.INCOME
                  ? sum + Number(row._sum.amount ?? 0)
                  : sum - Number(row._sum.amount ?? 0),
              0,
            ),
          )
        : Promise.resolve(0),
      this.prisma.eodRun.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          runDate: true,
          mode: true,
          status: true,
          startedAt: true,
          finishedAt: true,
        },
      }),
    ]);

    // Monthly income/expense for the last 6 months
    const now = new Date();
    const sixMonthsAgo = startOfMonthUtc(addMonthsUtc(now, -5));

    const recentTxs = whereTeams
      ? await this.prisma.transaction.findMany({
          where: { ...whereTeams, createdAt: { gte: sixMonthsAgo } },
          select: { type: true, amount: true, createdAt: true },
        })
      : [];

    const buckets = new Map<string, { pemasukan: number; pengeluaran: number }>();
    for (const tx of recentTxs) {
      const d = tx.createdAt;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const cur = buckets.get(key) ?? { pemasukan: 0, pengeluaran: 0 };
      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) cur.pemasukan += amount;
      else cur.pengeluaran += amount;
      buckets.set(key, cur);
    }

    const MONTH_LABELS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const d = addMonthsUtc(sixMonthsAgo, i);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const entry = buckets.get(key) ?? { pemasukan: 0, pengeluaran: 0 };
      return { label: MONTH_LABELS_ID[d.getUTCMonth()], ...entry };
    });

    const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const currentMonthData = buckets.get(currentMonthKey) ?? { pemasukan: 0, pengeluaran: 0 };

    return {
      totalBalance: transactionTotals,
      totalIncome: currentMonthData.pemasukan,
      totalExpense: currentMonthData.pengeluaran,
      activeMembers,
      totalMembers,
      paidInvoices,
      partialInvoices,
      unpaidInvoices,
      overdueInvoices,
      pendingApprovals,
      totalTeams,
      totalActiveTeams,
      totalInvoices,
      totalApprovedPayments,
      totalRejectedPayments,
      latestEodStatus: latestEodRun?.status ?? null,
      monthlyTrend,
    };
  }

  async listTransactions(userId: string, query: { month?: string; teamId?: string; page?: number; limit?: number }) {
    const currentUser = await this.accessService.getCurrentUser(userId);
    const accessibleIds = currentUser.isSuperAdmin || currentUser.role === SUPER_ADMIN_ROLE
      ? (await this.prisma.team.findMany({ select: { id: true } })).map((t) => t.id)
      : await this.accessService.getAccessibleTeamIds(userId);

    let teamIds: string[];
    if (query.teamId) {
      teamIds = accessibleIds.includes(query.teamId) ? [query.teamId] : [];
    } else {
      teamIds = accessibleIds;
    }

    if (!teamIds.length) return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };

    let dateFilter: { createdAt?: { gte: Date; lt: Date } } = {};
    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      if (year && month) {
        dateFilter = {
          createdAt: {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lt: new Date(Date.UTC(year, month, 1)),
          },
        };
      }
    }

    const { skip, take, page, limit } = buildPagination(query.page ?? 1, query.limit ?? 10);
    const where = { teamId: { in: teamIds }, ...dateFilter };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        select: {
          id: true,
          type: true,
          source: true,
          amount: true,
          description: true,
          createdAt: true,
          team: { select: { id: true, name: true } },
          creator: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async listUsers(userId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    if (!(await this.accessService.isSuperAdmin(userId))) {
      throw new ForbiddenException('Hanya super admin yang dapat mengelola user');
    }

    const pagination = buildPagination(query.page, query.limit);
    const sortBy = this.pickSort(query.sortBy, ['createdAt', 'fullName', 'email', 'role', 'status'], 'createdAt');
    const sortOrder = query.sortOrder ?? 'desc';
    const roleFilter = this.pickEnumValue(query.role, Object.values(SystemRole));
    const statusFilter = this.pickEnumValue(query.status, Object.values(UserStatus));
    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phoneNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          role: true,
          status: true,
          isSuperAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return this.toListResponse(data, total, pagination.page, pagination.limit);
  }

  async createUser(userId: string, dto: CreateUserDto) {
    await this.ensureSuperAdmin(userId);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        passwordHash,
        role: dto.role ?? MEMBER_ROLE,
        status: dto.status ?? UserStatus.ACTIVE,
        isSuperAdmin: (dto.role ?? MEMBER_ROLE) === SUPER_ADMIN_ROLE,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      action: 'CREATE_USER',
      module: 'users',
      targetId: created.id,
      description: `User ${created.fullName} dibuat`,
      metadata: {
        email: created.email,
        role: created.role,
        status: created.status,
      },
    });

    if (created.role === OWNER_ROLE) {
      await this.licenseAccessService.ensureTrialLicense(created.id);
    }

    return this.stripSensitiveUserFields(created);
  }

  async getUser(userId: string, targetUserId: string) {
    await this.ensureSuperAdmin(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        ownedTeams: {
          select: { id: true, name: true, status: true } as any,
        },
        teamMembers: {
          select: {
            id: true,
            teamId: true,
            memberName: true,
            systemRole: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async updateUser(userId: string, targetUserId: string, dto: UpdateUserDto) {
    await this.ensureSuperAdmin(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }

      const nextEmail = dto.email ?? user.email;
      if (nextEmail !== user.email) {
        const existingUser = await tx.user.findUnique({ where: { email: nextEmail } });
        if (existingUser && existingUser.id !== targetUserId) {
          throw new ConflictException('Email sudah terdaftar');
        }
      }

      const result = await tx.user.update({
        where: { id: targetUserId },
        data: {
          email: nextEmail,
          fullName: dto.fullName ?? user.fullName,
          phoneNumber: dto.phoneNumber === undefined ? user.phoneNumber : dto.phoneNumber || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'UPDATE_USER',
          module: 'users',
          targetId: targetUserId,
          description: `Data user ${result.fullName} diperbarui`,
          metadata: {
            targetUserId,
            email: result.email,
            fullName: result.fullName,
            phoneNumber: result.phoneNumber,
          },
        },
      });

      return result;
    });

    return this.stripSensitiveUserFields(updated);
  }

  async updateUserPassword(userId: string, targetUserId: string, dto: UpdateUserPasswordDto) {
    await this.ensureSuperAdmin(userId);

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      action: 'UPDATE_USER_PASSWORD',
      module: 'users',
      targetId: targetUserId,
      description: `Password user ${target.fullName} diperbarui oleh super admin`,
      metadata: {
        targetUserId,
      },
    });

    return { success: true };
  }

  async updateUserRole(userId: string, targetUserId: string, dto: UpdateUserRoleDto) {
    await this.ensureSuperAdmin(userId);
    if (userId === targetUserId) {
      throw new ForbiddenException('Anda tidak dapat mengubah role diri sendiri');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }

      const result = await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: dto.role,
          isSuperAdmin: dto.role === SUPER_ADMIN_ROLE,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          teamId: null,
          action: 'UPDATE_USER_ROLE',
          module: 'users',
          targetId: targetUserId,
          description: `Role user ${result.fullName} diubah menjadi ${dto.role}`,
          metadata: {
            targetUserId,
            role: dto.role,
          },
        },
      });

      return result;
    });

    if (dto.role === OWNER_ROLE) {
      await this.licenseAccessService.ensureTrialLicense(targetUserId);
    }

    return this.stripSensitiveUserFields(updated);
  }

  async updateUserStatus(userId: string, targetUserId: string, dto: UpdateUserStatusDto) {
    await this.ensureSuperAdmin(userId);
    if (userId === targetUserId) {
      throw new ForbiddenException('Anda tidak dapat mengubah status diri sendiri');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!user) {
        throw new NotFoundException('User tidak ditemukan');
      }

      const result = await tx.user.update({
        where: { id: targetUserId },
        data: { status: dto.status },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: dto.status === UserStatus.DISABLED ? 'DISABLE_USER' : 'ENABLE_USER',
          module: 'users',
          targetId: targetUserId,
          description: `Status user ${result.fullName} diubah menjadi ${dto.status}`,
          metadata: {
            targetUserId,
            status: dto.status,
          },
        },
      });

      return result;
    });

    return this.stripSensitiveUserFields(updated);
  }

  async deleteUser(userId: string, targetUserId: string) {
    await this.ensureSuperAdmin(userId);
    if (userId === targetUserId) {
      throw new ForbiddenException('Anda tidak dapat menghapus akun diri sendiri');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const relationChecks = await Promise.all([
      this.prisma.team.count({ where: { ownerId: targetUserId } }),
      this.prisma.teamMember.count({ where: { userId: targetUserId } }),
      this.prisma.contributionInvoice.count({ where: { userId: targetUserId } }),
      this.prisma.contributionPayment.count({ where: { userId: targetUserId } }),
      this.prisma.transaction.count({ where: { createdBy: targetUserId } }),
    ]);

    const hasRelatedData = relationChecks.some((count) => count > 0);
    if (hasRelatedData) {
      throw new BadRequestException('User memiliki relasi data dan tidak dapat dihapus permanen');
    }

    await this.prisma.user.delete({ where: { id: targetUserId } });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      action: 'DELETE_USER',
      module: 'users',
      targetId: targetUserId,
      description: `User ${target.fullName} dihapus`,
      metadata: {
        email: target.email,
      },
    });

    return { success: true };
  }

  async listTeams(userId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    const current = await this.accessService.getCurrentUser(userId);
    const scopeTeamIds =
      current.isSuperAdmin || current.role === SUPER_ADMIN_ROLE
        ? undefined
        : await this.accessService.getAccessibleTeamIds(userId);

    const pagination = buildPagination(query.page, query.limit);
    const sortBy = this.pickSort(query.sortBy, ['createdAt', 'name', 'status', 'updatedAt'], 'createdAt');
    const sortOrder = query.sortOrder ?? 'desc';
    const statusFilter = this.pickEnumValue(query.status, Object.values(TeamStatus));
    if (query.teamId && scopeTeamIds && !scopeTeamIds.includes(query.teamId)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tim ini');
    }
    const where: Prisma.TeamWhereInput = {
      ...(query.search
        ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.teamId
        ? { id: query.teamId }
        : scopeTeamIds
          ? { id: { in: scopeTeamIds } }
          : {}),
    };

    const [total, teams] = await this.prisma.$transaction([
      this.prisma.team.count({ where }),
      this.prisma.team.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          defaultInvoiceDueDay: true,
          status: true,
          ownerId: true,
          inviteCode: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const teamIds = teams.map((team) => team.id);
    const [memberCounts, invoiceCounts, transactionSums] = await Promise.all([
      teamIds.length
        ? this.prisma.teamMember.groupBy({
          by: ['teamId'],
          where: {
            teamId: { in: teamIds },
            status: TeamMemberStatus.ACTIVE,
          },
          _count: { _all: true },
        })
        : Promise.resolve([]),
      teamIds.length
        ? this.prisma.contributionInvoice.groupBy({
          by: ['teamId'],
          where: { teamId: { in: teamIds } },
          _count: { _all: true },
        })
        : Promise.resolve([]),
      teamIds.length
        ? this.prisma.transaction.groupBy({
          by: ['teamId', 'type'],
          where: { teamId: { in: teamIds } },
          _sum: { amount: true },
        })
        : Promise.resolve([]),
    ]);

    const memberCountMap = new Map<string, number>(
      memberCounts.map((item) => [item.teamId, item._count._all] as [string, number]),
    );
    const invoiceCountMap = new Map<string, number>(
      invoiceCounts.map((item) => [item.teamId, item._count._all] as [string, number]),
    );
    const balanceMap = new Map<string, number>();
    for (const item of transactionSums) {
      const amount = Number(item._sum.amount ?? 0);
      const currentBalance = balanceMap.get(item.teamId) ?? 0;
      balanceMap.set(
        item.teamId,
        item.type === TransactionType.INCOME ? currentBalance + amount : currentBalance - amount,
      );
    }

    const data = teams.map((team) => ({
      ...team,
      totalMembers: memberCountMap.get(team.id) ?? 0,
      totalInvoices: invoiceCountMap.get(team.id) ?? 0,
      totalBalance: balanceMap.get(team.id) ?? 0,
    }));

    return this.toListResponse(data, total, pagination.page, pagination.limit);
  }

  async getTeam(userId: string, teamId: string) {
    await this.accessService.assertTeamAccess(teamId, userId);
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        description: true,
        defaultInvoiceDueDay: true,
        status: true,
        ownerId: true,
        inviteCode: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    const [totalMembers, totalInvoices, balance] = await Promise.all([
      this.prisma.teamMember.count({
        where: { teamId, status: TeamMemberStatus.ACTIVE },
      }),
      this.prisma.contributionInvoice.count({ where: { teamId } }),
      this.prisma.transaction
        .groupBy({
          by: ['type'],
          where: { teamId },
          _sum: { amount: true },
        })
        .then((rows) =>
          rows.reduce(
            (sum, row) =>
              row.type === TransactionType.INCOME
                ? sum + Number(row._sum.amount ?? 0)
                : sum - Number(row._sum.amount ?? 0),
            0,
          ),
        ),
    ]);

    return {
      ...team,
      totalMembers,
      totalInvoices,
      totalBalance: balance,
    };
  }

  async updateTeam(userId: string, teamId: string, dto: UpdateTeamDto) {
    await this.accessService.assertOwnerOrSuperAdmin(teamId, userId);

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: dto.name,
        description: dto.description,
        defaultInvoiceDueDay: dto.defaultInvoiceDueDay,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId,
      action: 'UPDATE_TEAM',
      module: 'teams',
      targetId: teamId,
      description: `Tim ${updated.name} diperbarui`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async updateTeamStatus(userId: string, teamId: string, dto: UpdateTeamStatusDto) {
    await this.ensureSuperAdmin(userId);

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        status: dto.status,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId,
      action: 'UPDATE_TEAM_STATUS',
      module: 'teams',
      targetId: teamId,
      description: `Status tim ${updated.name} diubah menjadi ${dto.status}`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async listTeamMembers(userId: string, teamId: string, query: AdminQueryDto) {
    await this.accessService.assertTeamAccess(teamId, userId);
    const pagination = buildPagination(query.page, query.limit);
    const sortBy = this.pickSort(query.sortBy, ['createdAt', 'memberName', 'status', 'systemRole'], 'createdAt');
    const sortOrder = query.sortOrder ?? 'desc';
    const statusFilter = this.pickEnumValue(query.status, Object.values(TeamMemberStatus));
    const roleFilter = this.pickEnumValue(query.role, Object.values(SystemRole));

    const where: Prisma.TeamMemberWhereInput = {
      teamId,
      ...(query.search
        ? {
          OR: [
            { memberName: { contains: query.search, mode: 'insensitive' } },
            { phoneNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(roleFilter ? { systemRole: roleFilter } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.teamMember.count({ where }),
      this.prisma.teamMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              status: true,
            },
          },
          role: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return this.toListResponse(data, total, pagination.page, pagination.limit);
  }

  async getTeamMember(userId: string, teamId: string, memberId: string) {
    await this.accessService.assertTeamAccess(teamId, userId);

    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
          },
        },
        role: true,
      },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('Member tidak ditemukan');
    }

    return member;
  }

  async createTeamMember(userId: string, teamId: string, dto: CreateTeamMemberDto) {
    await this.accessService.assertMemberManagementAccess(teamId, userId);

    if (dto.userId) {
      const existingMembership = await this.prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: dto.userId,
          },
        },
      });

      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!targetUser) {
        throw new NotFoundException('User tidak ditemukan');
      }

      const payload = {
        teamId,
        userId: dto.userId,
        roleId: dto.roleId ?? null,
        memberName: dto.memberName ?? targetUser.fullName,
        phoneNumber: dto.phoneNumber ?? targetUser.phoneNumber,
        systemRole: dto.systemRole ?? SystemRole.MEMBER,
        status: dto.status ?? TeamMemberStatus.ACTIVE,
        joinedAt: (dto.status ?? TeamMemberStatus.ACTIVE) === TeamMemberStatus.ACTIVE ? new Date() : null,
      };

      const member = existingMembership
        ? await this.prisma.teamMember.update({
          where: { id: existingMembership.id },
          data: payload,
        })
        : await this.prisma.teamMember.create({
          data: payload,
        });

      await this.auditLogsService.createAdmin({
        actorId: userId,
        teamId,
        action: 'CREATE_TEAM_MEMBER',
        module: 'teams',
        targetId: member.id,
        description: `Member ${member.memberName} ditambahkan ke tim`,
        metadata: JSON.parse(JSON.stringify(payload)),
      });

      return member;
    }

    if (!dto.email || !dto.memberName) {
      throw new BadRequestException('userId atau email dan memberName wajib diisi');
    }

    const existingInvitation = await this.prisma.teamInvitation.findFirst({
      where: {
        teamId,
        invitedEmail: dto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Undangan untuk user ini sudah ada');
    }

    const inviteCode = await this.generateUniqueInvitationCode(teamId);
    const invitation = await this.prisma.teamInvitation.create({
      data: {
        teamId,
        invitedName: dto.memberName,
        invitedEmail: dto.email,
        invitedPhone: dto.phoneNumber,
        roleId: dto.roleId,
        inviteCode,
        invitedBy: userId,
        status: InvitationStatus.PENDING,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId,
      action: 'INVITE_TEAM_MEMBER',
      module: 'teams',
      targetId: invitation.id,
      description: `Undangan member ${dto.memberName} dibuat`,
      metadata: {
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        roleId: dto.roleId,
      },
    });

    return invitation;
  }

  async updateTeamMemberRole(userId: string, teamId: string, memberId: string, role: SystemRole) {
    await this.accessService.assertMemberManagementAccess(teamId, userId);
    const membership = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!membership || membership.teamId !== teamId) {
      throw new NotFoundException('Member tidak ditemukan');
    }

    if (!ADMIN_TEAM_ROLES.some((allowedRole) => allowedRole === role)) {
      throw new BadRequestException('Role member tidak valid untuk admin panel');
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { systemRole: role },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId,
      action: 'UPDATE_TEAM_MEMBER_ROLE',
      module: 'teams',
      targetId: memberId,
      description: `Role member ${updated.memberName} diubah menjadi ${role}`,
      metadata: { role },
    });

    return updated;
  }

  async updateTeamMemberStatus(userId: string, teamId: string, memberId: string, status: TeamMemberStatus) {
    await this.accessService.assertMemberEditAccess(teamId, userId);
    const membership = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!membership || membership.teamId !== teamId) {
      throw new NotFoundException('Member tidak ditemukan');
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        status,
        joinedAt: status === TeamMemberStatus.ACTIVE ? (membership.joinedAt ?? new Date()) : membership.joinedAt,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId,
      action: 'UPDATE_TEAM_MEMBER_STATUS',
      module: 'teams',
      targetId: memberId,
      description: `Status member ${updated.memberName} diubah menjadi ${status}`,
      metadata: { status },
    });

    return updated;
  }

  async listInvoices(userId: string, query: AdminQueryDto) {
    const current = await this.accessService.getCurrentUser(userId);
    const scopeTeamIds =
      current.isSuperAdmin || current.role === SUPER_ADMIN_ROLE
        ? undefined
        : await this.accessService.getAccessibleTeamIds(userId);

    if (query.teamId && scopeTeamIds && !scopeTeamIds.includes(query.teamId)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tim ini');
    }

    const pagination = buildPagination(query.page, query.limit);
    const sortBy = this.pickSort(query.sortBy, ['createdAt', 'dueDate', 'periodDate', 'status', 'amount'], 'createdAt');
    const sortOrder = query.sortOrder ?? 'desc';
    const periodRange = this.resolvePeriodRange(query.period, query.periodFrom, query.periodTo);
    const statusFilter = this.pickEnumValue(query.status, Object.values(InvoiceStatus));

    const where: Prisma.ContributionInvoiceWhereInput = {
      ...(scopeTeamIds ? { teamId: { in: scopeTeamIds } } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.invoiceId ? { id: query.invoiceId } : {}),
      ...(query.search
        ? {
          OR: [
            { invoiceCode: { contains: query.search, mode: 'insensitive' } },
            { team: { name: { contains: query.search, mode: 'insensitive' } } },
            { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
        : {}),
      ...(periodRange ? { periodDate: periodRange } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
          dueDate: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
        : {}),
    };

    const [total, aggregate, data] = await this.prisma.$transaction([
      this.prisma.contributionInvoice.count({ where }),
      this.prisma.contributionInvoice.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.contributionInvoice.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          role: true,
          team: {
            select: {
              id: true,
              name: true,
            } as any,
          },
          payments: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const totalAmount = Number(aggregate._sum.amount ?? 0);

    return this.toListResponse(data, total, pagination.page, pagination.limit, totalAmount);
  }

  async getInvoice(userId: string, invoiceId: string) {
    const invoice = await this.prisma.contributionInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
        role: true,
        team: {
          select: { id: true, name: true } as any,
        },
        payments: {
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
            account: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    await this.accessService.assertTeamAccess(invoice.teamId, userId);
    return invoice;
  }

  async createInvoice(userId: string, dto: CreateInvoiceDto) {
    await this.accessService.assertInvoiceManagementAccess(dto.teamId, userId);
    const [team, role, user] = await Promise.all([
      this.prisma.team.findUnique({ where: { id: dto.teamId } }),
      this.prisma.role.findFirst({
        where: {
          id: dto.roleId,
          teamId: dto.teamId,
        },
      }),
      this.prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: dto.teamId,
            userId: dto.userId,
          },
        },
      }),
    ]);

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan');
    }

    if (!user || user.status !== TeamMemberStatus.ACTIVE) {
      throw new BadRequestException('Member tidak aktif atau belum tergabung di tim');
    }

    const dueDate = new Date(dto.dueDate);
    const periodDate = new Date(dto.periodDate);
    const invoiceCode = await generateInvoiceCode(this.prisma, dto.teamId, team.name, periodDate);

    const invoice = await this.prisma.contributionInvoice.create({
      data: {
        invoiceCode,
        teamId: dto.teamId,
        userId: dto.userId,
        roleId: dto.roleId,
        periodDate,
        dueDate,
        amount: dto.amount,
        status: dto.status ?? InvoiceStatus.DRAFT,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId: dto.teamId,
      action: 'CREATE_INVOICE',
      module: 'invoices',
      targetId: invoice.id,
      description: `Tagihan ${invoice.invoiceCode} dibuat`,
      metadata: {
        userId: dto.userId,
        roleId: dto.roleId,
        amount: dto.amount,
        status: dto.status ?? InvoiceStatus.DRAFT,
      },
    });

    await this.queueService.addNotificationJob({
      userId: dto.userId,
      teamId: dto.teamId,
      type: 'INVOICE_CREATED',
      title: 'Tagihan baru tersedia',
      message: `Tagihan ${invoice.invoiceCode} untuk tim ${team.name} sudah terbit dan bisa dibayar.`,
      data: {
        invoiceId: invoice.id,
        teamId: dto.teamId,
        invoiceCode: invoice.invoiceCode,
        dueDate,
        amount: String(dto.amount),
      },
    });

    return invoice;
  }

  async updateInvoice(userId: string, invoiceId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.contributionInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    await this.accessService.assertInvoiceManagementAccess(invoice.teamId, userId);
    const updated = await this.prisma.contributionInvoice.update({
      where: { id: invoiceId },
      data: {
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        amount: dto.amount ?? undefined,
        status: dto.status,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId: invoice.teamId,
      action: 'UPDATE_INVOICE',
      module: 'invoices',
      targetId: invoiceId,
      description: `Tagihan ${updated.invoiceCode} diperbarui`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async updateInvoiceStatus(userId: string, invoiceId: string, dto: UpdateInvoiceStatusDto) {
    const invoice = await this.prisma.contributionInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    await this.accessService.assertInvoiceManagementAccess(invoice.teamId, userId);
    const updated = await this.prisma.contributionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: dto.status,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId: userId,
      teamId: invoice.teamId,
      action: 'UPDATE_INVOICE_STATUS',
      module: 'invoices',
      targetId: invoiceId,
      description: `Status tagihan ${updated.invoiceCode} diubah menjadi ${dto.status}`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async listPayments(userId: string, query: AdminQueryDto) {
    const current = await this.accessService.getCurrentUser(userId);
    const scopeTeamIds =
      current.isSuperAdmin || current.role === SUPER_ADMIN_ROLE
        ? undefined
        : await this.accessService.getAccessibleTeamIds(userId);

    if (query.teamId && scopeTeamIds && !scopeTeamIds.includes(query.teamId)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tim ini');
    }

    const pagination = buildPagination(query.page, query.limit);
    const sortBy = this.pickSort(query.sortBy, ['createdAt', 'amount', 'status', 'approvedAt'], 'createdAt');
    const sortOrder = query.sortOrder ?? 'desc';
    const statusFilter = this.pickEnumValue(query.status, Object.values(PaymentStatus));
    const where: Prisma.ContributionPaymentWhereInput = {
      ...(scopeTeamIds ? { teamId: { in: scopeTeamIds } } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.memberId ? { userId: query.memberId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.search
        ? {
            OR: [
              { invoice: { invoiceCode: { contains: query.search, mode: 'insensitive' } } },
              { team: { name: { contains: query.search, mode: 'insensitive' } } },
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { note: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
          createdAt: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
        : {}),
    };

    const [total, aggregate, data] = await this.prisma.$transaction([
      this.prisma.contributionPayment.count({ where }),
      this.prisma.contributionPayment.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.contributionPayment.findMany({
        where,
        include: {
          invoice: true,
          user: {
            select: { id: true, email: true, fullName: true },
          },
          team: {
            select: { id: true, name: true, status: true } as any,
          },
          account: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const totalAmount = Number(aggregate._sum.amount ?? 0);

    return this.toListResponse(
      await Promise.all(data.map((payment) => this.withSignedProofUrl(payment))),
      total,
      pagination.page,
      pagination.limit,
      totalAmount,
    );
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: true,
        user: {
          select: { id: true, email: true, fullName: true },
        },
        team: {
          select: { id: true, name: true } as any,
        },
        account: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    await this.accessService.assertTeamAccess(payment.teamId, userId);
    return this.withSignedProofUrl(payment);
  }

  async listPaymentConfirmations(userId: string, query: AdminQueryDto) {
    return this.listPayments(userId, query);
  }

  async getPaymentConfirmation(userId: string, paymentId: string) {
    return this.getPayment(userId, paymentId);
  }

  async approvePaymentConfirmation(
    userId: string,
    paymentId: string,
    dto: ApprovePaymentConfirmationDto,
  ) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    await this.accessService.assertPaymentManagementAccess(payment.teamId, userId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Pembayaran sudah diproses');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.contributionPayment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.APPROVED,
          approvedById: userId,
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

      await tx.transaction.create({
        data: {
          teamId: payment.teamId,
          accountId: payment.accountId,
          type: TransactionType.INCOME,
          source: TransactionSource.CONTRIBUTION,
          amount: payment.amount,
          description: `Pembayaran disetujui untuk tagihan ${payment.invoice.invoiceCode}`,
          proofUrl: payment.proofUrl,
          storageKey: payment.storageKey,
          originalFileName: payment.originalFileName,
          mimeType: payment.mimeType,
          fileSize: payment.fileSize,
          referenceId: payment.id,
          createdBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          teamId: payment.teamId,
          action: 'APPROVE_PAYMENT',
          module: 'payments',
          targetId: payment.id,
          description: `Pembayaran untuk ${payment.invoice.invoiceCode} disetujui`,
          metadata: {
            paymentId,
            invoiceStatus: updatedInvoice.status,
            approvedTotal,
            note: dto.note ?? null,
          },
        },
      });

      return {
        payment: updatedPayment,
        invoice: updatedInvoice,
      };
    });

    await this.queueService
      .addNotificationJob({
        userId: payment.userId,
        teamId: payment.teamId,
        type: 'PAYMENT_APPROVED',
        title: 'Pembayaran disetujui',
        message: `Pembayaran untuk tagihan ${payment.invoice.invoiceCode} telah disetujui`,
        data: {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          invoiceStatus: result.invoice.status,
        },
      })
      .catch((error) => this.logger.warn(`Gagal kirim notifikasi approval payment: ${error instanceof Error ? error.message : 'unknown'}`));

    return result.payment;
  }

  async rejectPaymentConfirmation(
    userId: string,
    paymentId: string,
    dto: RejectPaymentConfirmationDto,
  ) {
    const payment = await this.prisma.contributionPayment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    await this.accessService.assertPaymentManagementAccess(payment.teamId, userId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Pembayaran sudah diproses');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.contributionPayment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REJECTED,
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectedReason: dto.reason,
          approvedById: null,
          approvedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          teamId: payment.teamId,
          action: 'REJECT_PAYMENT',
          module: 'payments',
          targetId: payment.id,
          description: `Pembayaran untuk ${payment.invoice.invoiceCode} ditolak`,
          metadata: {
            paymentId,
            reason: dto.reason,
          },
        },
      });

      return result;
    });

    await this.queueService
      .addNotificationJob({
        userId: payment.userId,
        teamId: payment.teamId,
        type: 'PAYMENT_REJECTED',
        title: 'Pembayaran ditolak',
        message: `Pembayaran untuk tagihan ${payment.invoice.invoiceCode} ditolak`,
        data: {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
        },
      })
      .catch((error) => this.logger.warn(`Gagal kirim notifikasi reject payment: ${error instanceof Error ? error.message : 'unknown'}`));

    return updated;
  }

  async runEod(userId: string, dto: RunEodDto) {
    await this.ensureSuperAdmin(userId);

    const lockAcquired = await this.acquireEodLock();
    if (!lockAcquired) {
      throw new ConflictException('EOD manual sedang berjalan');
    }

    const runDate = startOfDayUtc(dto.date ? new Date(dto.date) : new Date());
    const metadata = {
      reason: dto.reason ?? 'Run manual dari Web Admin Panel',
      source: 'admin-panel',
    };

    try {
      const existingRunning = await this.prisma.eodRun.findFirst({
        where: { status: EodStatus.RUNNING },
      });
      if (existingRunning) {
        throw new ConflictException('EOD manual sedang berjalan');
      }

      const eodRun = await this.prisma.eodRun.create({
        data: {
          runDate,
          mode: EodMode.MANUAL,
          status: EodStatus.RUNNING,
          startedAt: new Date(),
          triggeredById: userId,
          metadata,
        },
      });

      const overdueCandidates = await this.prisma.contributionInvoice.findMany({
        where: {
          dueDate: { lt: runDate },
          status: {
            in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.DRAFT],
          },
        },
        select: { id: true },
      });

      const processedCount = overdueCandidates.length;
      const successCount = await this.prisma.$transaction(async (tx) => {
        const result = await tx.contributionInvoice.updateMany({
          where: {
            id: { in: overdueCandidates.map((invoice) => invoice.id) },
          },
          data: {
            status: InvoiceStatus.OVERDUE,
          },
        });

        await tx.eodRun.update({
          where: { id: eodRun.id },
          data: {
            status: EodStatus.SUCCESS,
            finishedAt: new Date(),
            processedCount,
            successCount: result.count,
            failedCount: processedCount - result.count,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: userId,
            teamId: null,
            action: 'RUN_EOD_MANUAL',
            module: 'eod',
            targetId: eodRun.id,
            description: 'EOD manual dijalankan',
            metadata: {
              ...metadata,
              runDate,
              processedCount,
              successCount: result.count,
              failedCount: processedCount - result.count,
            },
          },
        });

        return result.count;
      });

      await this.queueService.addInvoiceReminderJob().catch((error) => {
        this.logger.warn(`Gagal enqueue reminder setelah EOD: ${error instanceof Error ? error.message : 'unknown'}`);
      });

      return {
        success: true,
        message: 'EOD berhasil dijalankan',
        data: {
          eodRunId: eodRun.id,
          processedCount,
          successCount,
          failedCount: processedCount - successCount,
          status: EodStatus.SUCCESS,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      await this.prisma.eodRun
        .updateMany({
          where: {
            status: EodStatus.RUNNING,
            triggeredById: userId,
            mode: EodMode.MANUAL,
          },
          data: {
            status: EodStatus.FAILED,
            finishedAt: new Date(),
            errorMessage: message,
          },
        })
        .catch(() => undefined);

      await this.auditLogsService
        .createAdmin({
          actorId: userId,
          teamId: null,
          action: 'RUN_EOD_MANUAL',
          module: 'eod',
          targetId: null,
          description: 'EOD manual gagal dijalankan',
          metadata: {
            ...metadata,
            errorMessage: message,
          },
        })
        .catch(() => undefined);

      throw error;
    } finally {
      await this.releaseEodLock().catch(() => undefined);
    }
  }

  async listEodHistory(userId: string, query: AdminQueryDto) {
    await this.ensureSuperAdmin(userId);
    const pagination = buildPagination(query.page, query.limit);
    const sortBy = this.pickSort(query.sortBy, ['createdAt', 'runDate', 'status', 'startedAt'], 'createdAt');
    const sortOrder = query.sortOrder ?? 'desc';
    const statusFilter = this.pickEnumValue(query.status, Object.values(EodStatus));
    const where: Prisma.EodRunWhereInput = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
          runDate: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.eodRun.count({ where }),
      this.prisma.eodRun.findMany({
        where,
        include: {
          triggeredBy: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return this.toListResponse(data, total, pagination.page, pagination.limit);
  }

  async getEodHistoryItem(userId: string, id: string) {
    await this.ensureSuperAdmin(userId);
    const record = await this.prisma.eodRun.findUnique({
      where: { id },
      include: {
        triggeredBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Riwayat EOD tidak ditemukan');
    }

    return record;
  }

  async listAuditLogs(userId: string, query: AdminQueryDto) {
    const current = await this.accessService.getCurrentUser(userId);
    const isSuperAdmin = current.isSuperAdmin || current.role === SUPER_ADMIN_ROLE;
    const teamIds = isSuperAdmin ? undefined : await this.accessService.getAccessibleTeamIds(userId);

    if (query.teamId && teamIds && !teamIds.includes(query.teamId)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tim ini');
    }

    return this.auditLogsService.findAdminLogs({
      userId,
      isSuperAdmin,
      teamIds,
      page: query.page,
      limit: query.limit,
      search: query.search,
      action: query.action,
      module: query.module,
      actorId: query.actorId,
      teamId: query.teamId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  async listActivityLogs(userId: string, query: AdminQueryDto) {
    const current = await this.accessService.getCurrentUser(userId);
    const isSuperAdmin = current.isSuperAdmin || current.role === SUPER_ADMIN_ROLE;

    if (!isSuperAdmin) {
      throw new ForbiddenException('Hanya super admin yang dapat melihat activity logs');
    }

    return this.auditLogsService.findActivityLogs({
      page: query.page,
      limit: query.limit,
      search: query.search,
      action: query.action,
      entityType: query.entityType,
      teamId: query.teamId,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  private toListResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    totalAmount?: number,
  ): ListResponse<T> {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
      },
    };
  }

  private async withSignedProofUrl<T extends { proofUrl: string | null; storageKey: string | null }>(payment: T): Promise<T> {
    if (payment.storageKey) {
      return {
        ...payment,
        proofUrl: await this.uploadsService.getSignedUrl(payment.storageKey),
      } as T;
    }

    return payment;
  }

  private pickSort(sortBy: string | undefined, allowed: string[], fallback: string) {
    if (!sortBy) {
      return fallback;
    }

    return allowed.includes(sortBy) ? sortBy : fallback;
  }

  private pickEnumValue<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
    if (!value) {
      return undefined;
    }

    return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
  }

  private resolvePeriodRange(period?: string, periodFrom?: string, periodTo?: string) {
    if (period) {
      const normalized = /^\d{4}-\d{2}$/.test(period) ? `${period}-01` : period;
      const baseDate = new Date(normalized);
      if (Number.isNaN(baseDate.getTime())) {
        return undefined;
      }

      const start = startOfMonthUtc(baseDate);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
      return {
        gte: start,
        lte: end,
      };
    }

    if (periodFrom || periodTo) {
      return {
        ...(periodFrom ? { gte: new Date(periodFrom) } : {}),
        ...(periodTo ? { lte: new Date(periodTo) } : {}),
      };
    }

    return undefined;
  }

  private async ensureSuperAdmin(userId: string) {
    const current = await this.accessService.getCurrentUser(userId);
    if (!current.isSuperAdmin && current.role !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Hanya super admin yang dapat mengakses endpoint ini');
    }
  }

  private async generateUniqueInvitationCode(teamId: string): Promise<string> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    let inviteCode = buildTeamInvitationStyleCode(team.name);
    while (await this.prisma.teamInvitation.findUnique({ where: { inviteCode } })) {
      inviteCode = buildTeamInvitationStyleCode(team.name);
    }
    return inviteCode;
  }

  private async acquireEodLock(): Promise<boolean> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
        `SELECT pg_try_advisory_lock(hashtext('kolekto:eod_manual')) AS locked`,
      );
      return Boolean(rows?.[0]?.locked);
    } catch (error) {
      this.logger.warn(`Gagal acquire EOD lock: ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }

  private async releaseEodLock(): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `SELECT pg_advisory_unlock(hashtext('kolekto:eod_manual'))`,
    );
  }

  private stripSensitiveUserFields<T extends Record<string, unknown>>(user: T) {
    const { passwordHash, ...safe } = user as T & { passwordHash?: string };
    return safe;
  }
}
