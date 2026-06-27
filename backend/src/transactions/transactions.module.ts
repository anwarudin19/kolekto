import { Module } from '@nestjs/common';
import { AccountsModule } from 'src/accounts/accounts.module';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { QueueModule } from 'src/queue/queue.module';
import { TeamsModule } from 'src/teams/teams.module';
import { TransactionCategoriesModule } from 'src/transaction-categories/transaction-categories.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [TeamsModule, AccountsModule, QueueModule, UploadsModule, AuditLogsModule, TransactionCategoriesModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
