import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus, LicenseStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { diffDaysUtc } from 'src/common/utils/date';
import { formatIndonesianWibDate } from 'src/common/utils/timezone';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationJobPayload } from '../jobs/notification.jobs';
import { InvoiceReminderJobPayload } from '../jobs/reminder.jobs';
import { REMINDER_JOB_PROCESS, REMINDER_QUEUE } from '../queue.constants';
import { QueueService } from '../queue.service';

@Injectable()
@Processor(REMINDER_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly licenseAccessService: LicenseAccessService,
  ) {
    super();
  }

  async process(job: Job<InvoiceReminderJobPayload>): Promise<unknown> {
    if (job.name !== REMINDER_JOB_PROCESS) {
      return null;
    }

    this.logger.log(`Memproses job pengingat ${job.id}`);
    const today = new Date(job.data.triggeredAtMs);
    const invoices = await this.prisma.contributionInvoice.findMany({
      where: {
        status: {
          in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE, InvoiceStatus.EXPIRED],
        },
      },
    });

    let processed = 0;

    for (const invoice of invoices) {
      const team = await this.prisma.team.findUnique({
        where: { id: invoice.teamId },
        select: { ownerId: true },
      });
      if (!team) {
        continue;
      }

      const ownerLicense = await this.licenseAccessService.getCurrentLicense(team.ownerId);
      if (!ownerLicense || (ownerLicense.status !== LicenseStatus.TRIAL && ownerLicense.status !== LicenseStatus.ACTIVE)) {
        continue;
      }
      if (!ownerLicense.plan.allowReminder) {
        continue;
      }

      const remainingDays = diffDaysUtc(today, invoice.dueDate);
      const reminderType =
        remainingDays === 3
          ? 'H-3'
          : remainingDays === 1
            ? 'H-1'
            : remainingDays < 0
              ? 'OVERDUE'
              : null;

      if (!reminderType) {
        continue;
      }

      const exists = await this.prisma.invoiceReminder.findUnique({
        where: {
          invoiceId_userId_reminderType: {
            invoiceId: invoice.id,
            userId: invoice.userId,
            reminderType,
          },
        },
      });

      if (exists) {
        continue;
      }

      await this.prisma.invoiceReminder.create({
        data: {
          invoiceId: invoice.id,
          userId: invoice.userId,
          reminderType,
          sentAt: new Date(),
        },
      });

      const payload: NotificationJobPayload = {
        userId: invoice.userId,
        teamId: invoice.teamId,
        type: 'INVOICE_REMINDER',
        title: `Pengingat tagihan iuran ${reminderType}`,
        message: `Tagihan ${invoice.invoiceCode} perlu dibayar sebelum ${formatIndonesianWibDate(invoice.dueDate)}`,
        data: {
          invoiceId: invoice.id,
          reminderType,
        },
      };

      await this.queueService.addNotificationJob(payload);
      processed += 1;
    }

    return { processed };
  }
}
