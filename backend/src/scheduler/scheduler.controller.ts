import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SuperAdminGuard } from 'src/common/guards/super-admin.guard';
import { RunBillingSchedulerDto } from './dto/run-billing-scheduler.dto';
import { SchedulerService } from './scheduler.service';

@ApiTags('scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
    constructor(private readonly schedulerService: SchedulerService) { }

    @Post('billing/run')
    @UseGuards(SuperAdminGuard)
    runBillingManually(@CurrentUser() user: CurrentUserPayload, @Body() dto: RunBillingSchedulerDto) {
        return this.schedulerService.runBillingEodManually(user.sub, dto.triggerDate, dto.scope, dto.teamId);
    }
}
