import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { LicensesModule } from 'src/licenses/licenses.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { TeamsModule } from 'src/teams/teams.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
    imports: [TeamsModule, AuditLogsModule, NotificationsModule, LicensesModule],
    controllers: [InvitationsController],
    providers: [InvitationsService],
    exports: [InvitationsService],
})
export class InvitationsModule { }
