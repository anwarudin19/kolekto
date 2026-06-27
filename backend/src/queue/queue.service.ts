import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { formatWibDate } from 'src/common/utils/timezone';
import { GenerateMonthlyInvoicesJobPayload } from './jobs/billing.jobs';
import { FileCleanupJobPayload } from './jobs/file-cleanup.jobs';
import { NotificationJobPayload } from './jobs/notification.jobs';
import { InvoiceReminderJobPayload } from './jobs/reminder.jobs';
import {
  BILLING_JOB_GENERATE_MONTHLY,
  BILLING_QUEUE,
  FILE_CLEANUP_JOB_DELETE,
  FILE_CLEANUP_QUEUE,
  NOTIFICATION_JOB_CREATE,
  NOTIFICATION_QUEUE,
  REMINDER_JOB_PROCESS,
  REMINDER_QUEUE,
} from './queue.constants';

@Injectable()
export class QueueService {
  private readonly removeOnComplete: number;
  private readonly removeOnFail: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(BILLING_QUEUE) private readonly billingQueue: Queue,
    @InjectQueue(REMINDER_QUEUE) private readonly reminderQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    @InjectQueue(FILE_CLEANUP_QUEUE) private readonly fileCleanupQueue: Queue,
  ) {
    this.removeOnComplete = this.configService.get<number>('redis.queueRemoveOnComplete', 100);
    this.removeOnFail = this.configService.get<number>('redis.queueRemoveOnFail', 500);
  }

  async addGenerateMonthlyInvoicesJob(
    periodDate?: Date,
    options?: { teamId?: string; actorId?: string; source?: 'scheduler' | 'manual' },
  ): Promise<void> {
    const payload: GenerateMonthlyInvoicesJobPayload = {
      periodDateMs: periodDate?.getTime(),
      teamId: options?.teamId,
      actorId: options?.actorId,
      source: options?.source,
    };

    const periodTag = periodDate ? formatWibDate(periodDate) : 'current-month';
    const scopeTag = options?.teamId ? `team-${options.teamId}` : 'all';
    const sourceTag = options?.source ?? 'scheduler';
    const actorTag = options?.actorId ? `__${options.actorId}` : '';
    const runTag = options?.source === 'manual' ? `__${Date.now()}` : '';
    await this.billingQueue.add(
      BILLING_JOB_GENERATE_MONTHLY,
      payload,
      this.buildJobOptions(`billing__${scopeTag}__${periodTag}__${sourceTag}${actorTag}${runTag}`),
    );
  }

  async addInvoiceReminderJob(): Promise<void> {
    const triggeredAt = new Date();
    const payload: InvoiceReminderJobPayload = {
      triggeredAtMs: triggeredAt.getTime(),
    };

    await this.reminderQueue.add(
      REMINDER_JOB_PROCESS,
      payload,
      this.buildJobOptions(`reminder__${formatWibDate(triggeredAt)}`),
    );
  }

  async addNotificationJob(payload: NotificationJobPayload): Promise<void> {
    const jobId = `notification__${payload.type}__${payload.userId}__${Date.now()}`;
    await this.notificationQueue.add(NOTIFICATION_JOB_CREATE, payload, this.buildJobOptions(jobId));
  }

  async addFileCleanupJob(storageKey: string): Promise<void> {
    const payload: FileCleanupJobPayload = { storageKey };
    await this.fileCleanupQueue.add(
      FILE_CLEANUP_JOB_DELETE,
      payload,
      this.buildJobOptions(`file-cleanup__${Buffer.from(storageKey).toString('base64url')}`),
    );
  }

  private buildJobOptions(jobId: string) {
    return {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2_000,
      },
      removeOnComplete: this.removeOnComplete,
      removeOnFail: this.removeOnFail,
    };
  }
}
