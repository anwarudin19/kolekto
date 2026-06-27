import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, Prisma } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { buildPagination } from 'src/common/utils/pagination';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

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
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async list(query: ListPlansQueryDto): Promise<ListResponse<any>> {
    const pagination = buildPagination(query.page, query.limit);
    const where: Prisma.PlanWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.plan.count({ where }),
      this.prisma.plan.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
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

  async create(actorId: string, dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Code plan sudah digunakan');
    }

    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        code: dto.code,
        price: dto.price,
        billingCycle: dto.billingCycle as BillingCycle,
        maxTeams: dto.maxTeams,
        maxMembers: dto.maxMembers,
        allowReminder: dto.allowReminder,
        allowExport: dto.allowExport,
        allowAuditLog: dto.allowAuditLog,
        allowCustomBranding: dto.allowCustomBranding,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId,
      teamId: null,
      action: 'CREATE_PLAN',
      module: 'license',
      targetId: plan.id,
      description: `Plan ${plan.name} dibuat`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return plan;
  }

  async update(actorId: string, planId: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Plan tidak ditemukan');
    }

    if (dto.code && dto.code !== plan.code) {
      const existing = await this.prisma.plan.findUnique({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException('Code plan sudah digunakan');
      }
    }

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...dto,
      },
    });

    await this.auditLogsService.createAdmin({
      actorId,
      teamId: null,
      action: 'UPDATE_PLAN',
      module: 'license',
      targetId: updated.id,
      description: `Plan ${updated.name} diperbarui`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async findTrialPlan() {
    return this.prisma.plan.findFirst({
      where: {
        code: 'TRIAL',
        isActive: true,
      },
    });
  }

  async findActiveById(id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan tidak ditemukan');
    }

    return plan;
  }
}
