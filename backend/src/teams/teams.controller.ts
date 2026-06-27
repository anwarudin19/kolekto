import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { createIndonesianValidationException } from 'src/common/utils/validation';
import { CreateTeamDto } from './dto/create-team.dto';
import { JoinTeamDto } from './dto/join-team.dto';
import { ListTeamsQueryDto } from './dto/list-teams-query.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) { }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query() query: ListTeamsQueryDto) {
    return this.teamsService.list(user.sub, query);
  }

  @Get(':id')
  @UseGuards(TeamMembershipGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.teamsService.findOne(id, user.sub);
  }

  @Post('join')
  join(
    @CurrentUser() user: CurrentUserPayload,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        exceptionFactory: createIndonesianValidationException,
      }),
    )
    dto: JoinTeamDto,
  ) {
    return this.teamsService.join(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(TeamMembershipGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, user.sub, dto);
  }
}
