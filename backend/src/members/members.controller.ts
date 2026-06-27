import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
@Controller('teams/:teamId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Param('teamId') teamId: string, @Query() query: AdminQueryDto) {
    return this.membersService.list(teamId, query);
  }

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMemberDto,
  ) {
    return this.membersService.create(teamId, user.sub, dto);
  }

  @Patch(':memberId')
  update(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(teamId, memberId, user.sub, dto);
  }
}
