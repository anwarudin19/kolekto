import { forwardRef, Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { LicensesModule } from 'src/licenses/licenses.module';
import { QueueModule } from 'src/queue/queue.module';
import { TeamsModule } from 'src/teams/teams.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TeamsModule, AuditLogsModule, LicensesModule, forwardRef(() => QueueModule)],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
