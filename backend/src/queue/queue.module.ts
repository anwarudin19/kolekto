import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoicesModule } from 'src/invoices/invoices.module';
import { LicensesModule } from 'src/licenses/licenses.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import {
  BILLING_QUEUE,
  FILE_CLEANUP_QUEUE,
  NOTIFICATION_QUEUE,
  REMINDER_QUEUE,
} from './queue.constants';
import { QueueService } from './queue.service';
import { BillingProcessor } from './processors/billing.processor';
import { FileCleanupProcessor } from './processors/file-cleanup.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ReminderProcessor } from './processors/reminder.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('BullMQ');

        return {
          connection: {
            host: configService.get<string>('redis.host', 'redis'),
            port: configService.get<number>('redis.port', 6379),
            password: configService.get<string | undefined>('redis.password'),
            db: configService.get<number>('redis.db', 0),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: configService.get<string>('redis.queuePrefix', 'kolekto'),
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2_000,
            },
            removeOnComplete: configService.get<number>('redis.queueRemoveOnComplete', 100),
            removeOnFail: configService.get<number>('redis.queueRemoveOnFail', 500),
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: BILLING_QUEUE },
      { name: REMINDER_QUEUE },
      { name: NOTIFICATION_QUEUE },
      { name: FILE_CLEANUP_QUEUE },
    ),
    PrismaModule,
    forwardRef(() => InvoicesModule),
    LicensesModule,
    NotificationsModule,
    UploadsModule,
  ],
  providers: [
    QueueService,
    BillingProcessor,
    ReminderProcessor,
    NotificationProcessor,
    FileCleanupProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
