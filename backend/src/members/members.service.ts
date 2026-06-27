import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, TeamMemberStatus } from '@prisma/client';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamsService } from 'src/teams/teams.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

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
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly licenseAccessService: LicenseAccessService,
  ) { }

  async list(teamId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    const pagination = buildPagination(query.page, query.limit);
    const statuses = query.status
      ?.split(',')
      .map((status) => status.trim())
      .filter((status): status is TeamMemberStatus => Object.values(TeamMemberStatus).includes(status as TeamMemberStatus));
    const where: Prisma.TeamMemberWhereInput = {
      teamId,
      ...(statuses?.length ? { status: { in: statuses } } : {}),
      ...(query.role ? { systemRole: query.role as SystemRole } : {}),
      ...(query.search
        ? {
          OR: [
            { memberName: { contains: query.search, mode: 'insensitive' } },
            { phoneNumber: { contains: query.search, mode: 'insensitive' } },
            { user: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
            { user: { is: { fullName: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
        : {}),
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
            },
          },
          role: true,
        },
        orderBy: { createdAt: 'asc' },
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

  async create(teamId: string, actorId: string, dto: CreateMemberDto) {
    const team = await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
    await this.ensureAdminPrivileges(teamId, actorId);
    await this.licenseAccessService.ensureCanAddMember(team.ownerId, teamId);
    const existingMembership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: dto.userId,
        },
      },
    });
    if (existingMembership) {
      throw new ConflictException('User sudah terdaftar di tim ini');
    }

    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        ...dto,
        joinedAt: dto.status === 'ACTIVE' ? new Date() : null,
      },
    });

    this.logger.log(
      `Member dibuat teamId=${teamId} actorId=${actorId} memberId=${member.id} userId=${member.userId} status=${member.status} systemRole=${member.systemRole}`,
    );

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'MEMBER_CREATED',
      entityType: 'TeamMember',
      entityId: member.id,
      description: `Member ${member.memberName} added to team`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return member;
  }

  async update(teamId: string, memberId: string, actorId: string, dto: UpdateMemberDto) {
    await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
    await this.ensureAdminPrivileges(teamId, actorId);

    const existingMember = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });
    if (!existingMember || existingMember.teamId !== teamId) {
      throw new NotFoundException('Member tidak ditemukan');
    }

    const member = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: dto,
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'MEMBER_UPDATED',
      entityType: 'TeamMember',
      entityId: member.id,
      description: `Member ${member.memberName} updated`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return member;
  }

  private async ensureAdminPrivileges(teamId: string, actorId: string) {
    const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat mengelola member');
    }
  }
}
