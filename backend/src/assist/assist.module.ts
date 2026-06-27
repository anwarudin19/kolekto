import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { AssistContextService } from './assist-context.service';
import { AssistController } from './assist.controller';
import { AssistGuestService } from './assist-guest.service';
import { AssistPolicyService } from './assist-policy.service';
import { AssistService } from './assist.service';
import { AssistTeamService } from './assist-team.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AssistController],
  providers: [
    AssistService,
    AssistGuestService,
    AssistTeamService,
    AssistPolicyService,
    AssistContextService,
  ],
})
export class AssistModule { }
