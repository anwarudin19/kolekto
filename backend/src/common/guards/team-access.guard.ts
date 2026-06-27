import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SystemRole, TeamMemberStatus, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;
const OWNER_ROLE = 'OWNER' as SystemRole;
const ADMIN_ROLE = 'ADMIN' as SystemRole;
const TREASURER_ROLE = 'TREASURER' as SystemRole;
const MEMBER_ROLE = 'MEMBER' as SystemRole;

@Injectable()
export class TeamAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user?: { sub?: string; role?: SystemRole; isSuperAdmin?: boolean; status?: UserStatus };
    }>();

    const teamId = request.params.teamId ?? request.params.id;
    const userId = request.user?.sub;

    if (!teamId) {
      return true;
    }

    if (!userId) {
      throw new UnauthorizedException('Data pengguna tidak valid');
    }

    const currentUser =
      request.user?.role !== undefined
        ? request.user
        : await this.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, status: true, isSuperAdmin: true },
        });

    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    if (currentUser.isSuperAdmin || currentUser.role === SUPER_ADMIN_ROLE) {
      return true;
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      select: {
        systemRole: true,
        status: true,
      },
    });

    if (!membership || membership.status !== TeamMemberStatus.ACTIVE) {
      throw new ForbiddenException('Anda tidak memiliki akses ke tim ini');
    }

    if (![OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE].some((role) => role === membership.systemRole)) {
      throw new ForbiddenException('Akses admin tim ditolak');
    }

    return true;
  }
}
