import { Module } from '@nestjs/common';
import { AccountsModule } from 'src/accounts/accounts.module';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { QueueModule } from 'src/queue/queue.module';
import { TeamsModule } from 'src/teams/teams.module';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [TeamsModule, AccountsModule, QueueModule, AuditLogsModule],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
