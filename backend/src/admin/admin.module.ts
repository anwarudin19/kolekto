import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { LicensesModule } from 'src/licenses/licenses.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QueueModule } from 'src/queue/queue.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TeamAccessGuard } from 'src/common/guards/team-access.guard';
import { AdminAccessService } from './admin-access.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, QueueModule, LicensesModule, UploadsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAccessService, RolesGuard, TeamAccessGuard],
})
export class AdminModule {}
