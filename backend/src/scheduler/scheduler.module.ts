import { Module } from '@nestjs/common';
import { SuperAdminGuard } from 'src/common/guards/super-admin.guard';
import { QueueModule } from 'src/queue/queue.module';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [QueueModule],
  controllers: [SchedulerController],
  providers: [SchedulerService, SuperAdminGuard],
  exports: [SchedulerService],
})
export class SchedulerModule { }
