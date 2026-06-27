import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, LicenseStatus, PaymentStatus, Prisma, SystemRole, TeamMemberStatus } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import {
  addDaysUtc,
  createUtcDate,
  getDaysInMonthUtc,
  isSameUtcDate,
  startOfDayUtc,
  startOfMonthUtc,
  subDaysUtc,
} from 'src/common/utils/date';
import { generateInvoiceCode } from 'src/common/utils/invoice-code';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { TeamsService } from 'src/teams/teams.service';
import { buildPagination } from 'src/common/utils/pagination';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

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
export class InvoicesService {
  private static readonly SYSTEM_DEFAULT_DUE_DAY = 1;
  private static readonly BILLING_LEAD_DAYS = 5;
  private static readonly HOLIDAY_LOOKBACK_DAYS = 7;
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
    private readonly licenseAccessService: LicenseAccessService,
    private readonly queueService: QueueService,
  ) { }

  private get teamRepo() {
    return (this.prisma as PrismaService & {
      team: {
        findUnique: (...args: any[]) => Promise<any>;
      };
    }).team;
  }

  private get teamMemberRepo() {
    return (this.prisma as PrismaService & {
      teamMember: {
        findMany: (...args: any[]) => Promise<any[]>;
      };
    }).teamMember;
  }

  private get holidayRepo() {
    return (this.prisma as PrismaService & {
      nationalHoliday: {
        findMany: (...args: any[]) => Promise<Array<{ holidayDate: Date; name: string }>>;
        count: (...args: any[]) => Promise<number>;
        createMany: (...args: any[]) => Promise<{ count: number }>;
      };
    }).nationalHoliday;
  }

  async list(teamId: string, userId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    const membership = await this.teamsService.ensureActiveMembership(teamId, userId);
    // OWNER/ADMIN/TREASURER melihat seluruh invoice tim; MEMBER hanya miliknya.
    const managerRoles: SystemRole[] = [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.TREASURER];
    const isManager = managerRoles.includes(membership.systemRole);

    const pagination = buildPagination(query.page, query.limit);
    const statuses = query.status
      ?.split(',')
      .map((status) => status.trim())
      .filter((status): status is InvoiceStatus => Object.values(InvoiceStatus).includes(status as InvoiceStatus));
    const where: Prisma.ContributionInvoiceWhereInput = {
      teamId,
      ...(isManager ? {} : { userId }),
      ...(statuses?.length ? { status: { in: statuses } } : {}),
      ...(query.search
        ? {
          OR: [
            { invoiceCode: { contains: query.search, mode: 'insensitive' } },
            { user: { is: { fullName: { contains: query.search, mode: 'insensitive' } } } },
            { user: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
            { role: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.contributionInvoice.count({ where }),
      this.prisma.contributionInvoice.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
          role: true,
        },
        orderBy: [{ periodDate: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const meta = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      viewerRole: membership.systemRole,
      canManage: isManager,
    };

    return {
      data: data as Record<string, unknown>[],
      meta,
    };
  }

  async listMine(userId: string, query: AdminQueryDto): Promise<ListResponse<Record<string, unknown>>> {
    const pagination = buildPagination(query.page, query.limit);
    const statusFilter = query.status && Object.values(InvoiceStatus).includes(query.status as InvoiceStatus)
      ? (query.status as InvoiceStatus)
      : undefined;
    const where: Prisma.ContributionInvoiceWhereInput = {
      userId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.search
        ? {
          OR: [
            { invoiceCode: { contains: query.search, mode: 'insensitive' as const } },
            { team: { is: { name: { contains: query.search, mode: 'insensitive' as const } } } },
            { role: { is: { name: { contains: query.search, mode: 'insensitive' as const } } } },
          ],
        }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.contributionInvoice.count({ where }),
      this.prisma.contributionInvoice.findMany({
        where,
        include: {
          team: { select: { id: true, name: true } },
          role: true,
          payments: {
            select: {
              id: true,
              amount: true,
              note: true,
              status: true,
              createdAt: true,
            },
            where: {
              status: {
                in: [PaymentStatus.PENDING, PaymentStatus.APPROVED],
              },
            },
          },
        },
        orderBy: [{ periodDate: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      data: data as Record<string, unknown>[],
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  async findOne(invoiceId: string, userId: string) {
    const invoice = await this.prisma.contributionInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: true,
        payments: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    await this.teamsService.ensureActiveMembership(invoice.teamId, userId);
    return invoice;
  }

  async generate(teamId: string, actorId: string, dto: GenerateInvoicesDto) {
    await this.licenseAccessService.ensureCanGenerateInvoice(teamId);
    const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat membuat tagihan');
    }

    const periodDate = dto.periodDate ? startOfMonthUtc(new Date(dto.periodDate)) : startOfMonthUtc();
    const team = await this.teamRepo.findUnique({
      where: { id: teamId },
      select: {
        defaultInvoiceDueDay: true,
        ownerId: true,
        name: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Tim tidak ditemukan');
    }

    const activeMembers = await this.teamMemberRepo.findMany({
      where: {
        teamId,
        status: TeamMemberStatus.ACTIVE,
        roleId: { not: null },
      },
        include: {
          role: true,
          user: true,
          team: {
            select: {
              name: true,
              ownerId: true,
            },
          },
        },
    });

    const generated: Awaited<ReturnType<typeof this.prisma.contributionInvoice.create>>[] = [];
    for (const member of activeMembers) {
      const ownerLicense = await this.licenseAccessService.getCurrentLicense(member.team.ownerId);
      if (!ownerLicense || (ownerLicense.status !== LicenseStatus.TRIAL && ownerLicense.status !== LicenseStatus.ACTIVE)) {
        continue;
      }

      const existing = await this.prisma.contributionInvoice.findUnique({
        where: {
          teamId_userId_periodDate: {
            teamId,
            userId: member.userId,
            periodDate,
          },
        },
      });

      if (existing || !member.role) {
        continue;
      }

      const dueDate = await this.resolveInvoiceDueDate(
        periodDate,
        team.defaultInvoiceDueDay,
        this.getRoleInvoiceDueDay(member.role),
      );

      const invoiceCode = await generateInvoiceCode(this.prisma, teamId, member.team.name, periodDate);
      const invoice = await this.prisma.contributionInvoice.create({
        data: {
          invoiceCode,
          teamId,
          userId: member.userId,
          roleId: member.roleId!,
          periodDate,
          dueDate,
          amount: member.role.feeAmount,
          status: InvoiceStatus.UNPAID,
        },
      });
      generated.push(invoice);
      await this.queueService.addNotificationJob({
        userId: member.userId,
        teamId,
        type: 'INVOICE_CREATED',
        title: 'Tagihan baru tersedia',
        message: `Tagihan ${invoice.invoiceCode} untuk tim ${team.name} sudah terbit dan bisa dibayar.`,
        data: {
          invoiceId: invoice.id,
          teamId,
          invoiceCode: invoice.invoiceCode,
          dueDate,
          amount: String(member.role.feeAmount),
        },
      });

      await this.auditLogsService.create({
        teamId,
        userId: actorId,
        action: 'INVOICE_GENERATED',
        entityType: 'ContributionInvoice',
        entityId: invoice.id,
        description: `Tagihan ${invoice.invoiceCode} dibuat untuk ${member.memberName}`,
      });
    }

    return {
      periodDate,
      totalGenerated: generated.length,
      invoices: generated,
    };
  }

  async generateMonthlyInvoicesForAllTeams(
    triggerDateInput?: Date,
    options?: { teamId?: string; actorId?: string; source?: 'scheduler' | 'manual' },
  ) {
    const triggerDate = startOfDayUtc(triggerDateInput ?? new Date());
    const source = options?.source ?? 'scheduler';
    const candidatePeriods =
      source === 'manual'
        ? [startOfMonthUtc(new Date())]
        : [
          startOfMonthUtc(triggerDate),
          startOfMonthUtc(addDaysUtc(createUtcDate(triggerDate.getUTCFullYear(), triggerDate.getUTCMonth(), 1), 32)),
        ];

    const activeMembers = await this.teamMemberRepo.findMany({
      where: {
        status: TeamMemberStatus.ACTIVE,
        roleId: { not: null },
        ...(options?.teamId ? { teamId: options.teamId } : {}),
      },
        include: {
          role: true,
          team: {
            select: {
              name: true,
              defaultInvoiceDueDay: true,
              ownerId: true,
            },
          },
        },
    });

    const generated: Awaited<ReturnType<typeof this.prisma.contributionInvoice.create>>[] = [];

    for (const member of activeMembers) {
      if (!member.role) {
        continue;
      }

      const ownerLicense = await this.licenseAccessService.getCurrentLicense(member.team.ownerId);
      if (!ownerLicense || (ownerLicense.status !== LicenseStatus.TRIAL && ownerLicense.status !== LicenseStatus.ACTIVE)) {
        continue;
      }

      for (const periodDate of candidatePeriods) {
        const dueDate = await this.resolveInvoiceDueDate(
          periodDate,
          member.team?.defaultInvoiceDueDay,
          this.getRoleInvoiceDueDay(member.role),
        );
        if (source !== 'manual') {
          const invoiceCreationDate = subDaysUtc(dueDate, InvoicesService.BILLING_LEAD_DAYS);
          if (!isSameUtcDate(invoiceCreationDate, triggerDate)) {
            continue;
          }
        }

        const existing = await this.prisma.contributionInvoice.findUnique({
          where: {
            teamId_userId_periodDate: {
              teamId: member.teamId,
              userId: member.userId,
              periodDate,
            },
          },
        });

        if (existing) {
          continue;
        }

        const invoiceCode = await generateInvoiceCode(this.prisma, member.teamId, member.team.name, periodDate);
        const invoice = await this.prisma.contributionInvoice.create({
          data: {
            invoiceCode,
            teamId: member.teamId,
            userId: member.userId,
            roleId: member.roleId!,
            periodDate,
            dueDate,
            amount: member.role.feeAmount,
            status: InvoiceStatus.UNPAID,
          },
        });
        generated.push(invoice);
        await this.queueService.addNotificationJob({
          userId: member.userId,
          teamId: member.teamId,
          type: 'INVOICE_CREATED',
          title: 'Tagihan baru tersedia',
          message: `Tagihan ${invoice.invoiceCode} untuk tim ${member.team.name} sudah terbit dan bisa dibayar.`,
          data: {
            invoiceId: invoice.id,
            teamId: member.teamId,
            invoiceCode: invoice.invoiceCode,
            dueDate,
            amount: String(member.role.feeAmount),
          },
        });

        await this.auditLogsService.create({
          teamId: member.teamId,
          userId: options?.actorId,
          action: source === 'manual' ? 'MANUAL_BILLING_INVOICE_GENERATED' : 'SCHEDULER_INVOICE_GENERATED',
          entityType: 'ContributionInvoice',
          entityId: invoice.id,
          description:
            source === 'manual'
              ? `Tagihan ${invoice.invoiceCode} dibuat dari manual billing`
              : `Tagihan ${invoice.invoiceCode} dibuat otomatis H-${InvoicesService.BILLING_LEAD_DAYS} sebelum jatuh tempo`,
          metadata: {
            triggerDate,
            dueDate,
            periodDate,
            source,
            scope: options?.teamId ? 'TEAM' : 'ALL',
            teamId: options?.teamId,
          },
        });
      }
    }

    return {
      triggerDate,
      totalGenerated: generated.length,
      scope: options?.teamId ? 'TEAM' : 'ALL',
      teamId: options?.teamId,
      invoices: generated,
    };
  }

  async update(invoiceId: string, actorId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.contributionInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    await this.licenseAccessService.ensureTeamWriteAllowed(invoice.teamId);
    const membership = await this.teamsService.ensureActiveMembership(invoice.teamId, actorId);
    if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat memperbarui tagihan');
    }

    const updated = await this.prisma.contributionInvoice.update({
      where: { id: invoiceId },
      data: {
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status,
      },
    });

    await this.auditLogsService.create({
      teamId: invoice.teamId,
      userId: actorId,
      action: 'INVOICE_UPDATED',
      entityType: 'ContributionInvoice',
      entityId: updated.id,
      description: `Tagihan ${updated.invoiceCode} diperbarui`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  private async resolveInvoiceDueDate(
    periodDate: Date,
    teamDueDay?: number | null,
    roleDueDay?: number | null,
  ): Promise<Date> {
    const configuredDueDay = teamDueDay ?? roleDueDay ?? InvoicesService.SYSTEM_DEFAULT_DUE_DAY;
    const originalDueDate = this.buildDueDateForPeriod(periodDate, configuredDueDay);
    const holidayDates = await this.loadHolidayDatesAround(originalDueDate);

    for (let offset = 0; offset <= InvoicesService.HOLIDAY_LOOKBACK_DAYS; offset += 1) {
      const candidate = subDaysUtc(originalDueDate, offset);
      if (!holidayDates.has(startOfDayUtc(candidate).toISOString())) {
        return candidate;
      }
    }

    return originalDueDate;
  }

  private buildDueDateForPeriod(periodDate: Date, configuredDueDay: number): Date {
    const year = periodDate.getUTCFullYear();
    const month = periodDate.getUTCMonth();
    const day = Math.min(configuredDueDay, getDaysInMonthUtc(year, month));
    return createUtcDate(year, month, day);
  }

  private async loadHolidayDatesAround(targetDate: Date): Promise<Set<string>> {
    await this.syncHolidayYearsAround(targetDate);

    const holidays = await this.holidayRepo.findMany({
      where: {
        holidayDate: {
          gte: subDaysUtc(targetDate, InvoicesService.HOLIDAY_LOOKBACK_DAYS),
          lte: targetDate,
        },
      },
      select: {
        holidayDate: true,
        name: true,
      },
    } as any);

    return new Set(holidays.map((holiday) => startOfDayUtc(new Date(holiday.holidayDate)).toISOString()));
  }

  private getRoleInvoiceDueDay(role: unknown) {
    if (!role || typeof role !== 'object' || !('invoiceDueDay' in role)) {
      return null;
    }

    const invoiceDueDay = (role as { invoiceDueDay?: number | null }).invoiceDueDay;
    return typeof invoiceDueDay === 'number' ? invoiceDueDay : null;
  }

  private async syncHolidayYearsAround(targetDate: Date): Promise<void> {
    const years = new Set<number>([
      subDaysUtc(targetDate, InvoicesService.HOLIDAY_LOOKBACK_DAYS).getUTCFullYear(),
      targetDate.getUTCFullYear(),
    ]);

    for (const year of years) {
      await this.syncNationalHolidaysFromApi(year);
    }
  }

  private async syncNationalHolidaysFromApi(year: number): Promise<void> {
    const existingCount = await this.holidayRepo.count({
      where: {
        holidayDate: {
          gte: createUtcDate(year, 0, 1),
          lte: createUtcDate(year, 11, 31),
        },
      },
    } as any);

    if (existingCount > 0) {
      return;
    }

    const baseUrl = this.configService.get<string>('app.holidayApiBaseUrl', 'https://date.nager.at/api/v3');
    const countryCode = this.configService.get<string>('app.holidayApiCountryCode', 'ID');
    const requestUrl = `${baseUrl.replace(/\/$/, '')}/PublicHolidays/${year}/${countryCode}`;

    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        this.logger.warn(`Gagal mengambil hari libur dari Nager.Date tahun ${year}: HTTP ${response.status}`);
        return;
      }

      const holidays = (await response.json()) as Array<{ date?: string; localName?: string; name?: string }>;
      const createPayload = holidays
        .filter((holiday) => typeof holiday.date === 'string' && holiday.date.length > 0)
        .map((holiday) => ({
          holidayDate: startOfDayUtc(new Date(`${holiday.date}T00:00:00.000Z`)),
          name: holiday.localName?.trim() || holiday.name?.trim() || `Hari libur ${holiday.date}`,
        }));

      if (!createPayload.length) {
        return;
      }

      await this.holidayRepo.createMany({
        data: createPayload,
        skipDuplicates: true,
      } as any);

      this.logger.log(`Berhasil sinkron hari libur nasional ${year} dari Nager.Date`);
    } catch (error) {
      this.logger.warn(
        `Gagal sinkron hari libur nasional ${year} dari Nager.Date: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
