import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { CacheService } from 'src/cache/cache.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationJobPayload } from '../jobs/notification.jobs';
import { NOTIFICATION_JOB_CREATE, NOTIFICATION_QUEUE, cacheKeys } from '../queue.constants';

@Injectable()
@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<unknown> {
    if (job.name !== NOTIFICATION_JOB_CREATE) {
      return null;
    }

    this.logger.log(`Memproses job notifikasi ${job.id}`);
    const notification = await this.notificationsService.create({
      userId: job.data.userId,
      teamId: job.data.teamId,
      type: job.data.type,
      title: job.data.title,
      message: job.data.message,
      data: (job.data.data ?? undefined) as Prisma.InputJsonValue | undefined,
    });

    await this.cacheService.del(cacheKeys.unreadNotificationCount(job.data.userId));
    return notification;
  }
}
