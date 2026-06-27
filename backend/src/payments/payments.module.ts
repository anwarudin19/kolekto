import { Module } from '@nestjs/common';
import { AccountsModule } from 'src/accounts/accounts.module';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { LicensesModule } from 'src/licenses/licenses.module';
import { QueueModule } from 'src/queue/queue.module';
import { TeamsModule } from 'src/teams/teams.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TeamsModule,
    AccountsModule,
    UploadsModule,
    QueueModule,
    AuditLogsModule,
    LicensesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
