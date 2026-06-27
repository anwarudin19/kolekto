import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoicesService } from 'src/invoices/invoices.service';
import { GenerateMonthlyInvoicesJobPayload } from '../jobs/billing.jobs';
import { BILLING_JOB_GENERATE_MONTHLY, BILLING_QUEUE } from '../queue.constants';

@Injectable()
@Processor(BILLING_QUEUE)
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(private readonly invoicesService: InvoicesService) {
    super();
  }

  async process(job: Job<GenerateMonthlyInvoicesJobPayload>): Promise<unknown> {
    if (job.name !== BILLING_JOB_GENERATE_MONTHLY) {
      return null;
    }

    this.logger.log(`Memproses job billing ${job.id}`);
    return this.invoicesService.generateMonthlyInvoicesForAllTeams(job.data.periodDateMs ? new Date(job.data.periodDateMs) : undefined, {
      teamId: job.data.teamId,
      actorId: job.data.actorId,
      source: job.data.source,
    });
  }
}
