import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
@Controller('teams/:teamId/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  list(@Param('teamId') teamId: string) {
    return this.rolesService.list(teamId);
  }

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(teamId, user.sub, dto);
  }

  @Patch(':roleId')
  update(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(teamId, roleId, user.sub, dto);
  }

  @Delete(':roleId')
  delete(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.rolesService.delete(teamId, roleId, user.sub);
  }
}
