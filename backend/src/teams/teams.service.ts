import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole, TeamMemberStatus } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { buildTeamInvitationStyleCode } from 'src/common/utils/invite-code';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JoinTeamDto } from './dto/join-team.dto';
import { ListTeamsQueryDto } from './dto/list-teams-query.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

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
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly licenseAccessService: LicenseAccessService,
  ) { }

  async create(ownerId: string, dto: CreateTeamDto) {
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
    });
    await this.licenseAccessService.ensureCanCreateTeam(ownerId);

    const team = await this.prisma.$transaction(async (tx) => {
      const inviteCode = await this.generateUniqueInviteCode(dto.name);
      const createdTeam = await tx.team.create({
        data: {
          name: dto.name,
          description: dto.description,
          defaultInvoiceDueDay: dto.defaultInvoiceDueDay,
          ownerId,
          inviteCode,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: createdTeam.id,
          userId: ownerId,
          memberName: owner.fullName,
          phoneNumber: owner.phoneNumber,
          systemRole: SystemRole.OWNER,
          status: TeamMemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });

      // Upgrade MEMBER to OWNER on first team creation
      if (owner.role === SystemRole.MEMBER) {
        await tx.user.update({
          where: { id: ownerId },
          data: { role: SystemRole.OWNER },
        });
      }

      return createdTeam;
    });

    await this.auditLogsService.create({
      teamId: team.id,
      userId: ownerId,
      action: 'TEAM_CREATED',
      entityType: 'Team',
      entityId: team.id,
      description: `Tim ${team.name} dibuat`,
    });

    return team;
  }

  async list(userId: string, query: ListTeamsQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    const pagination = buildPagination(query.page, query.limit);
    const where = {
      userId,
      status: TeamMemberStatus.ACTIVE,
    } as const;

    const [total, memberships] = await this.prisma.$transaction([
      this.prisma.teamMember.count({ where }),
      this.prisma.teamMember.findMany({
        where,
        include: {
          team: true,
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    if (!memberships.length) {
      return {
        data: [],
        meta: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
        },
      };
    }

    const teamIds = [...new Set(memberships.map((membership) => membership.teamId))];
    const memberCounts = await this.prisma.teamMember.groupBy({
      by: ['teamId'],
      where: {
        teamId: { in: teamIds },
        status: TeamMemberStatus.ACTIVE,
      },
      _count: {
        _all: true,
      },
    });

    const memberCountMap = new Map(memberCounts.map((item) => [item.teamId, item._count._all]));

    return {
      data: memberships.map((membership) => ({
        ...membership.team,
        totalMembers: memberCountMap.get(membership.teamId) ?? 0,
        userRole: membership.systemRole,
      })),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async findOne(teamId: string, userId: string) {
    await this.ensureActiveMembership(teamId, userId);

    const [team, totalMembers] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: teamId },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.teamMember.count({
        where: {
          teamId,
          status: TeamMemberStatus.ACTIVE,
        },
      }),
    ]);

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    return {
      ...team,
      totalMembers,
      userRole: (await this.ensureActiveMembership(teamId, userId)).systemRole,
    };
  }

  async join(userId: string, dto: JoinTeamDto) {
    const teamCode = this.normalizeJoinCode(dto.teamCode ?? dto.inviteCode);
    if (!teamCode) {
      throw new BadRequestException('Kode tim wajib diisi');
    }

    const team = await this.prisma.team.findUnique({
      where: { inviteCode: teamCode },
    });
    if (!team) {
      throw new NotFoundException('Kode tim tidak valid atau tidak ditemukan');
    }

    const existingMembership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId,
        },
      },
    });

    if (existingMembership && existingMembership.status === TeamMemberStatus.ACTIVE) {
      throw new ConflictException('Anda sudah bergabung dengan tim ini');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const membership = await this.prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId,
        },
      },
      update: {
        status: TeamMemberStatus.ACTIVE,
        joinedAt: new Date(),
        memberName: user.fullName,
        phoneNumber: user.phoneNumber,
      },
      create: {
        teamId: team.id,
        userId,
        memberName: user.fullName,
        phoneNumber: user.phoneNumber,
        systemRole: SystemRole.MEMBER,
        status: TeamMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      teamId: team.id,
      userId,
      action: 'TEAM_JOINED',
      entityType: 'TeamMember',
      entityId: membership.id,
      description: `${user.fullName} bergabung ke tim ${team.name}`,
    });

    return membership;
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
    const membership = await this.ensureActiveMembership(teamId, userId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat memperbarui tim');
    }

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: dto as any,
    });

    await this.auditLogsService.create({
      teamId,
      userId,
      action: 'TEAM_UPDATED',
      entityType: 'Team',
      entityId: team.id,
      description: `Tim ${team.name} diperbarui`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return team;
  }

  async ensureActiveMembership(teamId: string, userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (membership && membership.status === TeamMemberStatus.ACTIVE) {
      this.logger.log(
        `Membership aktif teamId=${teamId} userId=${userId} membershipStatus=${membership.status}`,
      );
      return membership;
    }

    const ownerMembership = await this.restoreOwnerMembership(teamId, userId);
    if (ownerMembership) {
      this.logger.warn(
        `Membership owner dipulihkan teamId=${teamId} userId=${userId} membershipStatus=${ownerMembership.status}`,
      );
      return ownerMembership;
    }

    this.logger.log(
      `Membership tidak aktif teamId=${teamId} userId=${userId} membershipFound=${Boolean(membership)} membershipStatus=${membership?.status ?? 'NONE'}`,
    );

    throw new ForbiddenException('Anda bukan anggota aktif dari tim ini');
  }

  private normalizeJoinCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    return normalized && normalized.length > 0 ? normalized : undefined;
  }

  private async restoreOwnerMembership(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!team || team.ownerId !== userId) {
      return null;
    }

    return this.prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      update: {
        memberName: team.owner.fullName,
        phoneNumber: team.owner.phoneNumber,
        systemRole: SystemRole.OWNER,
        status: TeamMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
      create: {
        teamId,
        userId,
        memberName: team.owner.fullName,
        phoneNumber: team.owner.phoneNumber,
        systemRole: SystemRole.OWNER,
        status: TeamMemberStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });
  }

  private async generateUniqueInviteCode(teamName: string): Promise<string> {
    let inviteCode = buildTeamInvitationStyleCode(teamName);
    while (await this.prisma.team.findUnique({ where: { inviteCode } })) {
      inviteCode = buildTeamInvitationStyleCode(teamName);
    }
    return inviteCode;
  }
}
