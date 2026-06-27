import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole, TeamMemberStatus, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;
const OWNER_ROLE = 'OWNER' as SystemRole;
const ADMIN_ROLE = 'ADMIN' as SystemRole;
const TREASURER_ROLE = 'TREASURER' as SystemRole;
const MEMBER_ROLE = 'MEMBER' as SystemRole;

@Injectable()
export class AdminAccessService {
  constructor(private readonly prisma: PrismaService) { }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    return user;
  }

  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.getCurrentUser(userId);
    return user.isSuperAdmin || user.role === SUPER_ADMIN_ROLE;
  }

  async getAccessibleTeamIds(userId: string): Promise<string[]> {
    if (await this.isSuperAdmin(userId)) {
      const teams = await this.prisma.team.findMany({
        select: { id: true },
      });
      return teams.map((team) => team.id);
    }

    const memberships = await this.prisma.teamMember.findMany({
      where: {
        userId,
        status: TeamMemberStatus.ACTIVE,
        systemRole: {
          in: [OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE],
        },
      },
      select: { teamId: true },
    });

    const ownedTeams = await this.prisma.team.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    return [...new Set([...memberships.map((item) => item.teamId), ...ownedTeams.map((team) => team.id)])];
  }

  async assertTeamAccess(teamId: string, userId: string) {
    if (await this.isSuperAdmin(userId)) {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new NotFoundException('Tim tidak ditemukan');
      }

      return { team, membership: null };
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });
    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== TeamMemberStatus.ACTIVE) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tim ini');
    }

    if (![OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE].some((role) => role === membership.systemRole)) {
      throw new ForbiddenException('Akses admin tim ditolak');
    }

    return { team, membership };
  }

  async assertOwnerOrSuperAdmin(teamId: string, userId: string) {
    const current = await this.getCurrentUser(userId);
    if (current.isSuperAdmin || current.role === SUPER_ADMIN_ROLE) {
      return this.assertTeamAccess(teamId, userId);
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Hanya owner atau super admin yang dapat mengubah tim');
    }

    return this.assertTeamAccess(teamId, userId);
  }

  async assertMemberManagementAccess(teamId: string, userId: string) {
    const { membership } = await this.assertTeamAccess(teamId, userId);
    if (!membership || ![OWNER_ROLE, ADMIN_ROLE].some((role) => role === membership.systemRole)) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk mengelola member');
    }
    return membership;
  }

  async assertMemberEditAccess(teamId: string, userId: string) {
    const { membership } = await this.assertTeamAccess(teamId, userId);
    if (!membership || ![OWNER_ROLE, ADMIN_ROLE, MEMBER_ROLE].some((role) => role === membership.systemRole)) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk mengedit member');
    }
    return membership;
  }

  async assertInvoiceManagementAccess(teamId: string, userId: string) {
    return this.assertTeamAccess(teamId, userId);
  }

  async assertPaymentManagementAccess(teamId: string, userId: string) {
    return this.assertTeamAccess(teamId, userId);
  }
}
