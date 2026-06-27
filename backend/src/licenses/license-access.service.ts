import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LicenseStatus, SystemRole, TeamMemberStatus } from '@prisma/client';
import { addDaysUtc } from 'src/common/utils/date';
import { PrismaService } from 'src/prisma/prisma.service';

export type LicenseFeatureName =
  | 'allowReminder'
  | 'allowExport'
  | 'allowAuditLog'
  | 'allowCustomBranding';

@Injectable()
export class LicenseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentLicense(ownerId: string) {
    const license = await this.prisma.ownerLicense.findUnique({
      where: { ownerId },
      include: {
        plan: true,
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            isSuperAdmin: true,
          },
        },
      },
    });

    if (!license) {
      return null;
    }

    return this.syncExpiredLicense(license.id);
  }

  async ensureTrialLicense(ownerId: string, trialDays = 14) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        role: true,
        status: true,
        isSuperAdmin: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('Owner tidak ditemukan');
    }

    if (owner.isSuperAdmin || owner.role === SystemRole.SUPER_ADMIN) {
      return null;
    }

    if (owner.role !== SystemRole.OWNER && owner.role !== SystemRole.MEMBER) {
      return null;
    }

    const existing = await this.prisma.ownerLicense.findUnique({
      where: { ownerId },
      include: { plan: true },
    });

    if (existing) {
      return existing;
    }

    const plan =
      (await this.prisma.plan.findFirst({
        where: { code: 'TRIAL', isActive: true },
      })) ??
      (await this.prisma.plan.findFirst({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      }));

    if (!plan) {
      throw new ForbiddenException('Plan trial belum tersedia');
    }

    const startDate = new Date();
    const endDate = addDaysUtc(startDate, trialDays);

    return this.prisma.ownerLicense.create({
      data: {
        ownerId,
        planId: plan.id,
        status: LicenseStatus.TRIAL,
        startDate,
        endDate,
        trialEndsAt: endDate,
        autoRenew: false,
      },
      include: {
        plan: true,
      },
    });
  }

  async ensureActiveLicense(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        role: true,
        status: true,
        isSuperAdmin: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('Owner tidak ditemukan');
    }

    if (owner.isSuperAdmin || owner.role === SystemRole.SUPER_ADMIN) {
      return null;
    }

    if (owner.role !== SystemRole.OWNER) {
      return null;
    }

    const license = (await this.ensureTrialLicense(ownerId)) ?? (await this.getCurrentLicense(ownerId));
    if (!license) {
      throw new ForbiddenException('Owner belum memiliki license aktif');
    }

    if (license.status === LicenseStatus.SUSPENDED || license.status === LicenseStatus.CANCELLED) {
      throw new ForbiddenException('License owner sedang tidak aktif');
    }

    const current = await this.syncExpiredLicense(license.id);
    if (
      current &&
      (current.status === LicenseStatus.TRIAL || current.status === LicenseStatus.ACTIVE) &&
      current.endDate.getTime() >= Date.now()
    ) {
      return current;
    }

    throw new ForbiddenException('License owner sudah kedaluwarsa');
  }

  async ensureCanCreateTeam(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        role: true,
        status: true,
        isSuperAdmin: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('Owner tidak ditemukan');
    }

    if (owner.isSuperAdmin || owner.role === SystemRole.SUPER_ADMIN) {
      return;
    }

    if (owner.role === SystemRole.MEMBER) {
      const totalTeams = await this.prisma.team.count({
        where: { ownerId },
      });

      if (totalTeams >= 1) {
        throw new ForbiddenException('Akun MEMBER hanya dapat membuat 1 team');
      }

      return;
    }

    if (owner.role !== SystemRole.OWNER) {
      return;
    }

    const license = await this.ensureActiveLicense(ownerId);
    if (!license) {
      throw new ForbiddenException('Owner belum memiliki license aktif');
    }

    const totalTeams = await this.prisma.team.count({
      where: { ownerId },
    });

    if (totalTeams >= license.plan.maxTeams) {
      throw new ForbiddenException(`Batas tim pada plan ${license.plan.name} sudah tercapai`);
    }
  }

  async ensureCanAddMember(ownerId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    if (team.ownerId !== ownerId) {
      throw new ForbiddenException('Tim ini tidak dimiliki owner yang dimaksud');
    }

    const license = await this.ensureActiveLicense(ownerId);
    if (!license) {
      return;
    }

    const totalMembers = await this.prisma.teamMember.count({
      where: {
        teamId,
        status: TeamMemberStatus.ACTIVE,
      },
    });

    if (totalMembers >= license.plan.maxMembers) {
      throw new ForbiddenException(`Batas member pada plan ${license.plan.name} sudah tercapai`);
    }
  }

  async ensureFeatureEnabled(ownerId: string, featureName: LicenseFeatureName) {
    const license = await this.ensureActiveLicense(ownerId);
    if (!license) {
      return;
    }

    if (!license.plan[featureName]) {
      throw new ForbiddenException(`Fitur ${featureName} tidak tersedia pada plan aktif`);
    }
  }

  async ensureTeamWriteAllowed(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            role: true,
            status: true,
            isSuperAdmin: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    if (team.owner.isSuperAdmin || team.owner.role === SystemRole.SUPER_ADMIN || team.owner.role !== SystemRole.OWNER) {
      return team;
    }

    await this.ensureActiveLicense(team.ownerId);
    return team;
  }

  async ensureCanGenerateInvoice(teamId: string) {
    return this.ensureTeamWriteAllowed(teamId);
  }

  async getTeamOwnerLicense(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            role: true,
            status: true,
            isSuperAdmin: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    if (team.owner.isSuperAdmin || team.owner.role === SystemRole.SUPER_ADMIN || team.owner.role !== SystemRole.OWNER) {
      return null;
    }

    return this.ensureActiveLicense(team.ownerId);
  }

  private async syncExpiredLicense(licenseId: string) {
    const license = await this.prisma.ownerLicense.findUnique({
      where: { id: licenseId },
      include: {
        plan: true,
        owner: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            status: true,
            isSuperAdmin: true,
          },
        },
      },
    });

    if (!license) {
      return null;
    }

    if (
      (license.status === LicenseStatus.TRIAL || license.status === LicenseStatus.ACTIVE) &&
      license.endDate.getTime() < Date.now()
    ) {
      return this.prisma.ownerLicense.update({
        where: { id: license.id },
        data: {
          status: LicenseStatus.EXPIRED,
        },
        include: {
          plan: true,
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              status: true,
              isSuperAdmin: true,
            },
          },
        },
      });
    }

    return license;
  }
}
