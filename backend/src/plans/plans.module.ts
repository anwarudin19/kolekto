import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlansController } from './plans.controller';
import { PublicPlansController } from './public-plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [PlansController, PublicPlansController],
  providers: [PlansService, RolesGuard],
  exports: [PlansService],
})
export class PlansModule {}
