import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  Prisma,
  TeamMemberStatus
} from '@prisma/client';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { buildPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) { }

  create(data: Prisma.ActivityLogUncheckedCreateInput) {
    return this.prisma.activityLog.create({ data });
  }

  async findByTeam(teamId: string, userId: string, query: AdminQueryDto) {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== TeamMemberStatus.ACTIVE) {
      throw new ForbiddenException('Anda bukan anggota aktif dari tim ini');
    }

    const pagination = buildPagination(query.page, query.limit);
    const where: Prisma.ActivityLogWhereInput = {
      teamId,
      ...(query.search
        ? {
          OR: [
            { action: { contains: query.search, mode: 'insensitive' } },
            { entityType: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: { user: { select: { fullName: true } } },
      }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  createAdmin(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.prisma.auditLog.create({ data });
  }

  async findAdminLogs(params: {
    userId: string;
    isSuperAdmin?: boolean;
    teamIds?: string[];
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    module?: string;
    actorId?: string;
    teamId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const {
      userId,
      isSuperAdmin,
      teamIds = [],
      page = 1,
      limit = 20,
      search,
      action,
      module,
      actorId,
      teamId,
      dateFrom,
      dateTo,
    } = params;

    const pagination = buildPagination(page, limit);
    const where: Prisma.AuditLogWhereInput = {
      ...(isSuperAdmin
        ? {}
        : {
          ...(teamId
            ? { teamId }
            : teamIds.length
              ? { teamId: { in: teamIds } }
              : { actorId: userId }),
        }),
      ...(isSuperAdmin ? (teamId ? { teamId } : teamIds.length ? { teamId: { in: teamIds } } : {}) : {}),
      ...(action ? { action } : {}),
      ...(module ? { module } : {}),
      ...(actorId ? { actorId } : {}),
      ...(search
        ? {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { action: { contains: search, mode: 'insensitive' } },
            { module: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
      ...(dateFrom || dateTo
        ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async findActivityLogs(params: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    entityType?: string;
    teamId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      action,
      entityType,
      teamId,
      userId,
      dateFrom,
      dateTo,
    } = params;

    const pagination = buildPagination(page, limit);
    const where: Prisma.ActivityLogWhereInput = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(teamId ? { teamId } : {}),
      ...(userId ? { userId } : {}),
      ...(search
        ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { entityType: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
      ...(dateFrom || dateTo
        ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }
}
