import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlansModule } from 'src/plans/plans.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { LicensesController } from './licenses.controller';
import { LicenseAccessService } from './license-access.service';
import { LicenseService } from './license.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, PlansModule, UploadsModule],
  controllers: [LicensesController],
  providers: [LicenseAccessService, LicenseService, RolesGuard],
  exports: [LicenseAccessService, LicenseService],
})
export class LicensesModule {}
