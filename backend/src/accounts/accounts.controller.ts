import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
@Controller('teams/:teamId/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(@Param('teamId') teamId: string) {
    return this.accountsService.list(teamId);
  }

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(teamId, user.sub, dto);
  }

  @Patch(':accountId')
  update(
    @Param('teamId') teamId: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(teamId, accountId, user.sub, dto);
  }

  @Get(':accountId/balance')
  getBalance(@Param('teamId') teamId: string, @Param('accountId') accountId: string) {
    return this.accountsService.getBalance(teamId, accountId);
  }
}
