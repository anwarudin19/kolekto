import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TeamAccessGuard } from 'src/common/guards/team-access.guard';
import { AdminService } from './admin.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { ApprovePaymentConfirmationDto } from './dto/approve-payment-confirmation.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RejectPaymentConfirmationDto } from './dto/reject-payment-confirmation.dto';
import { RunEodDto } from './dto/run-eod.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { UpdateTeamMemberStatusDto } from './dto/update-team-member-status.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;
const OWNER_ROLE = 'OWNER' as SystemRole;
const ADMIN_ROLE = 'ADMIN' as SystemRole;
const TREASURER_ROLE = 'TREASURER' as SystemRole;
const MEMBER_ROLE = 'MEMBER' as SystemRole;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('dashboard')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE)
  getDashboard(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.dashboard(user.sub, query.teamId);
  }

  @Get('transactions')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE)
  getTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('month') month?: string,
    @Query('teamId') teamId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listTransactions(user.sub, {
      month,
      teamId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('users')
  @Roles(SUPER_ADMIN_ROLE)
  getUsers(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listUsers(user.sub, query);
  }

  @Post('users')
  @Roles(SUPER_ADMIN_ROLE)
  createUser(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(user.sub, dto);
  }

  @Get('users/:id')
  @Roles(SUPER_ADMIN_ROLE)
  getUser(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.getUser(user.sub, id);
  }

  @Patch('users/:id')
  @Roles(SUPER_ADMIN_ROLE)
  updateUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(user.sub, id, dto);
  }

  @Patch('users/:id/password')
  @Roles(SUPER_ADMIN_ROLE)
  updateUserPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.adminService.updateUserPassword(user.sub, id, dto);
  }

  @Patch('users/:id/role')
  @Roles(SUPER_ADMIN_ROLE)
  updateUserRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(user.sub, id, dto);
  }

  @Patch('users/:id/status')
  @Roles(SUPER_ADMIN_ROLE)
  updateUserStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user.sub, id, dto);
  }

  @Delete('users/:id')
  @Roles(SUPER_ADMIN_ROLE)
  deleteUser(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.deleteUser(user.sub, id);
  }

  @Get('teams')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE)
  getTeams(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listTeams(user.sub, query);
  }

  @Get('teams/:id')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE)
  getTeam(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.getTeam(user.sub, id);
  }

  @Patch('teams/:id')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE)
  updateTeam(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.adminService.updateTeam(user.sub, id, dto);
  }

  @Patch('teams/:id/status')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE)
  updateTeamStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeamStatusDto,
  ) {
    return this.adminService.updateTeamStatus(user.sub, id, dto);
  }

  @Get('teams/:teamId/members')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE)
  getTeamMembers(
    @CurrentUser() user: CurrentUserPayload,
    @Param('teamId') teamId: string,
    @Query() query: AdminQueryDto,
  ) {
    return this.adminService.listTeamMembers(user.sub, teamId, query);
  }

  @Get('teams/:teamId/members/:memberId')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE, MEMBER_ROLE)
  getTeamMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.adminService.getTeamMember(user.sub, teamId, memberId);
  }

  @Post('teams/:teamId/members')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE)
  createTeamMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('teamId') teamId: string,
    @Body() dto: CreateTeamMemberDto,
  ) {
    return this.adminService.createTeamMember(user.sub, teamId, dto);
  }

  @Patch('teams/:teamId/members/:memberId/role')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE)
  updateTeamMemberRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
  ) {
    return this.adminService.updateTeamMemberRole(user.sub, teamId, memberId, dto.role);
  }

  @Patch('teams/:teamId/members/:memberId/status')
  @UseGuards(TeamAccessGuard)
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, MEMBER_ROLE)
  updateTeamMemberStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberStatusDto,
  ) {
    return this.adminService.updateTeamMemberStatus(user.sub, teamId, memberId, dto.status);
  }

  @Get('invoices')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  getInvoices(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listInvoices(user.sub, query);
  }

  @Get('invoices/:id')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  getInvoice(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.getInvoice(user.sub, id);
  }

  @Post('invoices')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  createInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.adminService.createInvoice(user.sub, dto);
  }

  @Patch('invoices/:id')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  updateInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.adminService.updateInvoice(user.sub, id, dto);
  }

  @Patch('invoices/:id/status')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  updateInvoiceStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.adminService.updateInvoiceStatus(user.sub, id, dto);
  }

  @Get('payments')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  getPayments(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listPayments(user.sub, query);
  }

  @Get('payments/:id')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  getPayment(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.getPayment(user.sub, id);
  }

  @Get('payment-confirmations')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  getPaymentConfirmations(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AdminQueryDto,
  ) {
    return this.adminService.listPaymentConfirmations(user.sub, query);
  }

  @Get('payment-confirmations/:id')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  getPaymentConfirmation(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.getPaymentConfirmation(user.sub, id);
  }

  @Post('payment-confirmations/:id/approve')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  approvePaymentConfirmation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ApprovePaymentConfirmationDto,
  ) {
    return this.adminService.approvePaymentConfirmation(user.sub, id, dto);
  }

  @Post('payment-confirmations/:id/reject')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE, ADMIN_ROLE, TREASURER_ROLE)
  rejectPaymentConfirmation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RejectPaymentConfirmationDto,
  ) {
    return this.adminService.rejectPaymentConfirmation(user.sub, id, dto);
  }

  @Post('eod/run')
  @Roles(SUPER_ADMIN_ROLE)
  runEod(@CurrentUser() user: CurrentUserPayload, @Body() dto: RunEodDto) {
    return this.adminService.runEod(user.sub, dto);
  }

  @Get('eod/history')
  @Roles(SUPER_ADMIN_ROLE)
  getEodHistory(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listEodHistory(user.sub, query);
  }

  @Get('eod/history/:id')
  @Roles(SUPER_ADMIN_ROLE)
  getEodHistoryItem(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adminService.getEodHistoryItem(user.sub, id);
  }

  @Get('audit-logs')
  @Roles(SUPER_ADMIN_ROLE, OWNER_ROLE)
  getAuditLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listAuditLogs(user.sub, query);
  }

  @Get('activity-logs')
  @Roles(SUPER_ADMIN_ROLE)
  getActivityLogs(@CurrentUser() user: CurrentUserPayload, @Query() query: AdminQueryDto) {
    return this.adminService.listActivityLogs(user.sub, query);
  }
}
