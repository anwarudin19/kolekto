import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
@Controller('teams/:teamId/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AdminQueryDto,
  ) {
    return this.auditLogsService.findByTeam(teamId, user.sub, query);
  }
}
