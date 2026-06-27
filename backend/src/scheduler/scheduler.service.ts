import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EodMode, EodStatus, InvoiceStatus } from '@prisma/client';
import { startOfDayUtc } from 'src/common/utils/date';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { BillingRunScope } from './dto/run-billing-scheduler.dto';

const BILLING_EOD_CRON = process.env.BILLING_EOD_CRON?.trim() || '55 23 * * *';
const INVOICE_REMINDER_CRON = process.env.INVOICE_REMINDER_CRON?.trim() || '0 8 * * *';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  @Cron(BILLING_EOD_CRON)
  async handleMonthlyBilling(): Promise<void> {
    await this.runAutomaticEod();
    await this.enqueueBillingRun(new Date(), 'scheduler');
  }

  @Cron(INVOICE_REMINDER_CRON)
  async handleInvoiceReminders(): Promise<void> {
    await this.queueService.addInvoiceReminderJob();
    const invoiceReminderCron = this.configService.get<string>('app.invoiceReminderCron', INVOICE_REMINDER_CRON);
    this.logger.log(`Job pengingat tagihan berhasil dimasukkan ke antrean (cron=${invoiceReminderCron})`);
  }

  async runBillingEodManually(actorId: string, triggerDate?: string, scope: BillingRunScope = BillingRunScope.ALL, teamId?: string) {
    const resolvedTriggerDate = triggerDate ? new Date(triggerDate) : new Date();

    if (scope === BillingRunScope.TEAM) {
      if (!teamId) {
        throw new BadRequestException('teamId wajib diisi saat scope TEAM');
      }

      const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
      if (!team) {
        throw new NotFoundException('Tim tidak ditemukan');
      }
    }

    await this.enqueueBillingRun(resolvedTriggerDate, `manual:${actorId}`, {
      teamId: scope === BillingRunScope.TEAM ? teamId : undefined,
      actorId,
      source: 'manual',
    });

    return {
      message: 'Job billing EOD manual berhasil dimasukkan ke antrean',
      triggerDate: resolvedTriggerDate,
      triggeredBy: actorId,
      scope,
      teamId: scope === BillingRunScope.TEAM ? teamId : undefined,
    };
  }

  private async enqueueBillingRun(
    triggerDate: Date,
    source: string,
    options?: { teamId?: string; actorId?: string; source?: 'scheduler' | 'manual' },
  ) {
    await this.queueService.addGenerateMonthlyInvoicesJob(triggerDate, options);
    const billingEodCron = this.configService.get<string>('app.billingEodCron', BILLING_EOD_CRON);
    this.logger.log(
      `Job billing harian EOD berhasil dimasukkan ke antrean (source=${source}, scope=${options?.teamId ? 'TEAM' : 'ALL'}, teamId=${options?.teamId ?? '-'}, cron=${billingEodCron})`,
    );
  }

  private async runAutomaticEod(): Promise<void> {
    const lockAcquired = await this.acquireEodLock();
    if (!lockAcquired) {
      this.logger.warn('EOD otomatis dilewati karena proses EOD lain sedang berjalan');
      return;
    }

    const runDate = startOfDayUtc(new Date());
    let eodRunId: string | null = null;

    try {
      const eodRun = await this.prisma.eodRun.create({
        data: {
          runDate,
          mode: EodMode.AUTO,
          status: EodStatus.RUNNING,
          startedAt: new Date(),
          metadata: {
            source: 'scheduler-cron',
          },
        },
      });
      eodRunId = eodRun.id;

      const overdueCandidates = await this.prisma.contributionInvoice.findMany({
        where: {
          dueDate: { lt: runDate },
          status: {
            in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.DRAFT],
          },
        },
        select: { id: true },
      });

      const processedCount = overdueCandidates.length;
      const result = await this.prisma.contributionInvoice.updateMany({
        where: {
          id: { in: overdueCandidates.map((invoice) => invoice.id) },
        },
        data: {
          status: InvoiceStatus.OVERDUE,
        },
      });

      await this.prisma.eodRun.update({
        where: { id: eodRun.id },
        data: {
          status: EodStatus.SUCCESS,
          finishedAt: new Date(),
          processedCount,
          successCount: result.count,
          failedCount: processedCount - result.count,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      if (eodRunId) {
        await this.prisma.eodRun.update({
          where: { id: eodRunId },
          data: {
            status: EodStatus.FAILED,
            finishedAt: new Date(),
            errorMessage: message,
          },
        }).catch(() => undefined);
      }

      this.logger.error(`EOD otomatis gagal: ${message}`);
    } finally {
      await this.releaseEodLock().catch(() => undefined);
    }
  }

  private async acquireEodLock(): Promise<boolean> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
      `SELECT pg_try_advisory_lock(hashtext('kolekto:eod_manual')) AS locked`,
    );
    return Boolean(rows?.[0]?.locked);
  }

  private async releaseEodLock(): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `SELECT pg_advisory_unlock(hashtext('kolekto:eod_manual'))`,
    );
  }
}
