import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamsService } from 'src/teams/teams.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly licenseAccessService: LicenseAccessService,
  ) { }

  list(teamId: string) {
    return this.prisma.role.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(teamId: string, actorId: string, dto: CreateRoleDto) {
    await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
    await this.ensureAdminPrivileges(teamId, actorId);

    const role = await this.prisma.role.create({
      data: {
        teamId,
        ...dto,
      },
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: role.id,
      description: `Role ${role.name} created`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return role;
  }

  async update(teamId: string, roleId: string, actorId: string, dto: UpdateRoleDto) {
    await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
    await this.ensureAdminPrivileges(teamId, actorId);

    const existingRole = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!existingRole || existingRole.teamId !== teamId) {
      throw new NotFoundException('Role tidak ditemukan');
    }

    const role = await this.prisma.role.update({
      where: { id: roleId },
      data: dto as any,
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'ROLE_UPDATED',
      entityType: 'Role',
      entityId: role.id,
      description: `Role ${role.name} updated`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return role;
  }

  async delete(teamId: string, roleId: string, actorId: string) {
    await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
    await this.ensureAdminPrivileges(teamId, actorId);

    const existingRole = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!existingRole || existingRole.teamId !== teamId) {
      throw new NotFoundException('Role tidak ditemukan');
    }

    const [memberCount, invoiceCount, invitationCount] = await Promise.all([
      this.prisma.teamMember.count({ where: { teamId, roleId } }),
      this.prisma.contributionInvoice.count({ where: { teamId, roleId } }),
      this.prisma.teamInvitation.count({ where: { teamId, roleId } }),
    ]);

    if (memberCount > 0 || invoiceCount > 0 || invitationCount > 0) {
      throw new ConflictException('Role masih dipakai member, invitation, atau invoice');
    }

    const role = await this.prisma.role.delete({
      where: { id: roleId },
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'ROLE_DELETED',
      entityType: 'Role',
      entityId: role.id,
      description: `Role ${role.name} deleted`,
      metadata: { id: role.id, name: role.name },
    });

    return role;
  }

  private async ensureAdminPrivileges(teamId: string, actorId: string) {
    const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat mengelola role');
    }
  }
}
