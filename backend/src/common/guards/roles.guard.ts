import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole, TeamMemberStatus, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user?: { sub?: string; role?: SystemRole; isSuperAdmin?: boolean; status?: UserStatus };
    }>();
    const userId = request.user?.sub;
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

    const teamId = request.params.teamId;

    if (!teamId) {
      if (currentUser.role && requiredRoles.includes(currentUser.role)) {
        return true;
      }

      const membership = await this.prisma.teamMember.findFirst({
        where: {
          userId,
          status: TeamMemberStatus.ACTIVE,
          systemRole: {
            in: requiredRoles,
          },
        },
      });

      if (membership) {
        return true;
      }

      throw new ForbiddenException('Konteks tim diperlukan untuk otorisasi role');
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!membership || !requiredRoles.includes(membership.systemRole)) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk aksi ini');
    }

    return true;
  }
}
