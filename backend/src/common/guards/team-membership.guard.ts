import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TeamMemberStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TeamMembershipGuard implements CanActivate {
  private readonly logger = new Logger(TeamMembershipGuard.name);

  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: Record<string, string>;
      user: { sub: string };
    }>();
    const teamId = request.params.teamId || request.params.id;
    const userId = request.user?.sub;

    if (!teamId) {
      return true;
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
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: { ownerId: true },
      });

      if (team?.ownerId === userId) {
        this.logger.warn(
          `Akses tim diizinkan via owner fallback teamId=${teamId} userId=${userId}`,
        );
        return true;
      }
    }

    if (!membership || membership.status !== TeamMemberStatus.ACTIVE) {
      this.logger.warn(
        `Akses tim ditolak teamId=${teamId} userId=${userId} membershipFound=${Boolean(membership)} membershipStatus=${membership?.status ?? 'NONE'}`,
      );
      throw new ForbiddenException('Anda bukan anggota aktif dari tim ini');
    }

    this.logger.log(
      `Akses tim diizinkan teamId=${teamId} userId=${userId} membershipStatus=${membership.status}`,
    );

    return true;
  }
}
