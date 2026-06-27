import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('teams/:teamId/invoices')
  @UseGuards(TeamMembershipGuard)
  list(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AdminQueryDto,
  ) {
    return this.invoicesService.list(teamId, user.sub, query);
  }

  @Get('invoices/me')
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.invoicesService.listMine(user.sub, query);
  }

  @Get('invoices/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.findOne(id, user.sub);
  }

  @Post('teams/:teamId/invoices/generate')
  @UseGuards(TeamMembershipGuard)
  generate(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateInvoicesDto,
  ) {
    return this.invoicesService.generate(teamId, user.sub, dto);
  }

  @Patch('invoices/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(id, user.sub, dto);
  }
}
