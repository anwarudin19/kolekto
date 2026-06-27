import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole, TeamMemberStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type AssistTeamAccess = {
  teamId: string;
  userId: string;
  role: SystemRole;
  isAdminLike: boolean;
  isMember: boolean;
  teamName: string;
  memberName: string;
};

const ADMIN_LIKE_ROLES: SystemRole[] = [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.TREASURER];

@Injectable()
export class AssistPolicyService {
  constructor(private readonly prisma: PrismaService) { }

  async ensureTeamAccess(teamId: string, userId: string): Promise<AssistTeamAccess> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
      },
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
      select: {
        memberName: true,
        status: true,
        systemRole: true,
      },
    });

    if (!membership || membership.status !== TeamMemberStatus.ACTIVE) {
      throw new ForbiddenException('Anda bukan anggota aktif dari tim ini');
    }

    const isAdminLike = ADMIN_LIKE_ROLES.includes(membership.systemRole);

    return {
      teamId,
      userId,
      role: membership.systemRole,
      isAdminLike,
      isMember: membership.systemRole === SystemRole.MEMBER,
      teamName: team.name,
      memberName: membership.memberName,
    };
  }

  assertAdminLike(access: AssistTeamAccess) {
    if (!access.isAdminLike) {
      throw new ForbiddenException('Kola hanya dapat menampilkan data pribadi untuk role member');
    }
  }
}
