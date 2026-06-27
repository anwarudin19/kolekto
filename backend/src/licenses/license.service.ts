import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, LicensePaymentStatus, LicenseStatus, Prisma } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { addMonthsUtc, addYearsUtc } from 'src/common/utils/date';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { CreateLicensePaymentDto } from './dto/create-license-payment.dto';
import { ExtendLicenseDto } from './dto/extend-license.dto';
import { ListLicensePaymentsQueryDto, ListLicensesQueryDto } from './dto/list-license-query.dto';
import { RejectLicensePaymentDto } from './dto/reject-license-payment.dto';
import { UpdateLicenseStatusDto } from './dto/update-license-status.dto';
import { LicenseAccessService } from './license-access.service';

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
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly accessService: LicenseAccessService,
  ) {}

  async current(ownerId: string) {
    await this.accessService.ensureTrialLicense(ownerId);
    return this.accessService.getCurrentLicense(ownerId);
  }

  async listLicenses(query: ListLicensesQueryDto): Promise<ListResponse<any>> {
    const pagination = buildPagination(query.page, query.limit);
    const where: Prisma.OwnerLicenseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.search
        ? {
            OR: [
              { owner: { email: { contains: query.search, mode: 'insensitive' } } },
              { owner: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { plan: { name: { contains: query.search, mode: 'insensitive' } } },
              { plan: { code: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.ownerLicense.count({ where }),
      this.prisma.ownerLicense.findMany({
        where,
        include: {
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
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async getLicenseById(id: string) {
    const license = await this.prisma.ownerLicense.findUnique({
      where: { id },
      include: {
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
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!license) {
      throw new NotFoundException('License tidak ditemukan');
    }

    return license;
  }

  async createLicense(actorId: string, dto: CreateLicenseDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId },
      select: { id: true, role: true, status: true, isSuperAdmin: true, fullName: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner tidak ditemukan');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Plan tidak ditemukan');
    }

    const data = {
      ownerId: dto.ownerId,
      planId: dto.planId,
      status: dto.status,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
      autoRenew: dto.autoRenew ?? false,
    };

    const license = await this.prisma.ownerLicense.upsert({
      where: { ownerId: dto.ownerId },
      create: data,
      update: data,
      include: {
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
        plan: true,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId,
      teamId: null,
      action: 'CREATE_LICENSE',
      module: 'license',
      targetId: license.id,
      description: `License untuk ${owner.fullName} dibuat`,
      metadata: {
        ownerId: dto.ownerId,
        planId: dto.planId,
        status: dto.status,
      },
    });

    return license;
  }

  async updateLicenseStatus(actorId: string, licenseId: string, dto: UpdateLicenseStatusDto) {
    const license = await this.prisma.ownerLicense.findUnique({
      where: { id: licenseId },
      include: { owner: true, plan: true },
    });
    if (!license) {
      throw new NotFoundException('License tidak ditemukan');
    }

    const updated = await this.prisma.ownerLicense.update({
      where: { id: licenseId },
      data: {
        status: dto.status,
      },
      include: {
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
        plan: true,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId,
      teamId: null,
      action: 'UPDATE_LICENSE_STATUS',
      module: 'license',
      targetId: licenseId,
      description: `Status license ${license.owner.fullName} diubah menjadi ${dto.status}`,
      metadata: {
        licenseId,
        status: dto.status,
      },
    });

    return updated;
  }

  async extendLicense(actorId: string, licenseId: string, dto: ExtendLicenseDto) {
    const license = await this.prisma.ownerLicense.findUnique({
      where: { id: licenseId },
      include: {
        plan: true,
        owner: true,
      },
    });
    if (!license) {
      throw new NotFoundException('License tidak ditemukan');
    }

    const cycles = dto.cycles ?? 1;
    const now = new Date();
    const baseDate = license.status === LicenseStatus.EXPIRED || license.endDate.getTime() < now.getTime()
      ? now
      : license.endDate;
    const endDate = this.addBillingCycle(baseDate, license.plan.billingCycle, cycles);
    const startDate = license.status === LicenseStatus.EXPIRED || license.status === LicenseStatus.CANCELLED || license.status === LicenseStatus.SUSPENDED
      ? now
      : license.startDate;

    const updated = await this.prisma.ownerLicense.update({
      where: { id: licenseId },
      data: {
        status: LicenseStatus.ACTIVE,
        startDate,
        endDate,
        trialEndsAt: null,
      },
      include: {
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
        plan: true,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId,
      teamId: null,
      action: 'EXTEND_LICENSE',
      module: 'license',
      targetId: licenseId,
      description: `License ${license.owner.fullName} diperpanjang`,
      metadata: {
        licenseId,
        cycles,
        endDate: updated.endDate,
      },
    });

    return updated;
  }

  async listPayments(query: ListLicensePaymentsQueryDto): Promise<ListResponse<any>> {
    const pagination = buildPagination(query.page, query.limit);
    const where: Prisma.LicensePaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.licenseId ? { licenseId: query.licenseId } : {}),
      ...(query.search
        ? {
            OR: [
              { owner: { email: { contains: query.search, mode: 'insensitive' } } },
              { owner: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { license: { plan: { name: { contains: query.search, mode: 'insensitive' } } } },
              { license: { plan: { code: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.licensePayment.count({ where }),
      this.prisma.licensePayment.findMany({
        where,
        include: {
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
          license: {
            include: {
              plan: true,
            },
          },
          approver: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async approveLicensePayment(actorId: string, paymentId: string) {
    const payment = await this.prisma.licensePayment.findUnique({
      where: { id: paymentId },
      include: {
        license: {
          include: {
            plan: true,
            owner: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment license tidak ditemukan');
    }

    if (payment.status !== LicensePaymentStatus.PENDING) {
      throw new BadRequestException('Payment license hanya dapat diproses satu kali');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.licensePayment.update({
        where: { id: paymentId },
        data: {
          status: LicensePaymentStatus.APPROVED,
          approvedById: actorId,
          approvedAt: new Date(),
          rejectedReason: null,
        },
        include: {
          license: {
            include: {
              plan: true,
              owner: true,
            },
          },
        },
      });

      const now = new Date();
      const baseDate =
        payment.license.status === LicenseStatus.EXPIRED || payment.license.endDate.getTime() < now.getTime()
          ? now
          : payment.license.endDate;
      const endDate = this.addBillingCycle(baseDate, payment.license.plan.billingCycle, 1);
      const startDate =
        payment.license.status === LicenseStatus.EXPIRED ||
        payment.license.status === LicenseStatus.CANCELLED ||
        payment.license.status === LicenseStatus.SUSPENDED
          ? now
          : payment.license.startDate;

      const updatedLicense = await tx.ownerLicense.update({
        where: { id: payment.licenseId },
        data: {
          status: LicenseStatus.ACTIVE,
          startDate,
          endDate,
          trialEndsAt: null,
        },
        include: {
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
          plan: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'APPROVE_LICENSE_PAYMENT',
          module: 'license',
          targetId: payment.id,
          description: `Payment license untuk ${updatedLicense.owner.fullName} disetujui`,
          metadata: {
            paymentId,
            licenseId: payment.licenseId,
            amount: payment.amount,
          },
        },
      });

      return {
        updatedPayment,
        updatedLicense,
      };
    });

    return result;
  }

  async rejectLicensePayment(actorId: string, paymentId: string, dto: RejectLicensePaymentDto) {
    const payment = await this.prisma.licensePayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment license tidak ditemukan');
    }

    if (payment.status !== LicensePaymentStatus.PENDING) {
      throw new BadRequestException('Payment license hanya dapat diproses satu kali');
    }

    const updated = await this.prisma.licensePayment.update({
      where: { id: paymentId },
      data: {
        status: LicensePaymentStatus.REJECTED,
        rejectedReason: dto.rejectedReason,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId,
      teamId: null,
      action: 'REJECT_LICENSE_PAYMENT',
      module: 'license',
      targetId: paymentId,
      description: `Payment license ditolak`,
      metadata: {
        paymentId,
        rejectedReason: dto.rejectedReason,
      },
    });

    return updated;
  }

  async createOwnerPaymentConfirmation(ownerId: string, dto: CreateLicensePaymentDto) {
    const license = await this.accessService.ensureTrialLicense(ownerId);
    const currentLicense = license ?? (await this.accessService.getCurrentLicense(ownerId));
    if (!currentLicense) {
      throw new NotFoundException('License owner tidak ditemukan');
    }

    const payment = await this.prisma.licensePayment.create({
      data: {
        licenseId: currentLicense.id,
        ownerId,
        amount: dto.amount,
        status: LicensePaymentStatus.PENDING,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        proofUrl: dto.proofUrl,
      },
      include: {
        license: {
          include: {
            plan: true,
          },
        },
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

    return payment;
  }

  async createLicensePaymentConfirmation(ownerId: string, dto: CreateLicensePaymentDto) {
    return this.createOwnerPaymentConfirmation(ownerId, dto);
  }

  private addBillingCycle(baseDate: Date, billingCycle: BillingCycle, cycles: number) {
    if (billingCycle === BillingCycle.YEARLY) {
      return addYearsUtc(baseDate, cycles);
    }

    return addMonthsUtc(baseDate, cycles);
  }
}
