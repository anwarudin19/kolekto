import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SystemRole, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { sub?: string; role?: SystemRole; isSuperAdmin?: boolean; status?: UserStatus };
    }>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Data pengguna tidak valid');
    }

    const user =
      request.user?.role !== undefined
        ? request.user
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, status: true, isSuperAdmin: true },
          });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    if (!user.isSuperAdmin && user.role !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Hanya super admin yang dapat menjalankan proses ini');
    }

    return true;
  }
}
