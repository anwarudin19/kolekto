import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { LicensesModule } from 'src/licenses/licenses.module';
import { TeamsModule } from 'src/teams/teams.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [TeamsModule, AuditLogsModule, LicensesModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
