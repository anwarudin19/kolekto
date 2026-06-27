import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { CreateTransactionCategoryDto } from './dto/create-transaction-category.dto';
import { UpdateTransactionCategoryDto } from './dto/update-transaction-category.dto';
import { TransactionCategoriesService } from './transaction-categories.service';

@ApiTags('transaction-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TeamMembershipGuard)
@Controller('teams/:teamId/transaction-categories')
export class TransactionCategoriesController {
  constructor(private readonly service: TransactionCategoriesService) {}

  @Get()
  list(@Param('teamId') teamId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.service.list(teamId, user.sub);
  }

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTransactionCategoryDto,
  ) {
    return this.service.create(teamId, user.sub, dto);
  }

  @Patch(':categoryId')
  update(
    @Param('teamId') teamId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateTransactionCategoryDto,
  ) {
    return this.service.update(teamId, categoryId, user.sub, dto);
  }

  @Delete(':categoryId')
  delete(
    @Param('teamId') teamId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.delete(teamId, categoryId, user.sub);
  }
}
