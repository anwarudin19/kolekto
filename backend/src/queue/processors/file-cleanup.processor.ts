import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { UploadsService } from 'src/uploads/uploads.service';
import { FileCleanupJobPayload } from '../jobs/file-cleanup.jobs';
import { FILE_CLEANUP_JOB_DELETE, FILE_CLEANUP_QUEUE } from '../queue.constants';

@Injectable()
@Processor(FILE_CLEANUP_QUEUE)
export class FileCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(FileCleanupProcessor.name);

  constructor(private readonly uploadsService: UploadsService) {
    super();
  }

  async process(job: Job<FileCleanupJobPayload>): Promise<unknown> {
    if (job.name !== FILE_CLEANUP_JOB_DELETE) {
      return null;
    }

    this.logger.log(`Memproses job pembersihan file ${job.id}`);
    await this.uploadsService.deleteFile(job.data.storageKey);
    return { deleted: job.data.storageKey };
  }
}
