import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateLicenseDto } from './dto/create-license.dto';
import { CreateLicensePaymentDto } from './dto/create-license-payment.dto';
import { ExtendLicenseDto } from './dto/extend-license.dto';
import { ListLicensePaymentsQueryDto, ListLicensesQueryDto } from './dto/list-license-query.dto';
import { RejectLicensePaymentDto } from './dto/reject-license-payment.dto';
import { UpdateLicenseStatusDto } from './dto/update-license-status.dto';
import { LicenseService } from './license.service';
import { UploadsService } from 'src/uploads/uploads.service';

@ApiTags('licenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class LicensesController {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get('admin/licenses')
  @Roles(SystemRole.SUPER_ADMIN)
  listLicenses(@Query() query: ListLicensesQueryDto) {
    return this.licenseService.listLicenses(query);
  }

  @Get('admin/licenses/:id')
  @Roles(SystemRole.SUPER_ADMIN)
  getLicense(@Param('id') id: string) {
    return this.licenseService.getLicenseById(id);
  }

  @Post('admin/licenses')
  @Roles(SystemRole.SUPER_ADMIN)
  createLicense(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateLicenseDto) {
    return this.licenseService.createLicense(user.sub, dto);
  }

  @Patch('admin/licenses/:id/status')
  @Roles(SystemRole.SUPER_ADMIN)
  updateLicenseStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLicenseStatusDto,
  ) {
    return this.licenseService.updateLicenseStatus(user.sub, id, dto);
  }

  @Post('admin/licenses/:id/extend')
  @Roles(SystemRole.SUPER_ADMIN)
  extendLicense(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ExtendLicenseDto,
  ) {
    return this.licenseService.extendLicense(user.sub, id, dto);
  }

  @Get('admin/license-payments')
  @Roles(SystemRole.SUPER_ADMIN)
  listPayments(@Query() query: ListLicensePaymentsQueryDto) {
    return this.licenseService.listPayments(query);
  }

  @Post('admin/license-payments/:id/approve')
  @Roles(SystemRole.SUPER_ADMIN)
  approvePayment(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.licenseService.approveLicensePayment(user.sub, id);
  }

  @Post('admin/license-payments/:id/reject')
  @Roles(SystemRole.SUPER_ADMIN)
  rejectPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RejectLicensePaymentDto,
  ) {
    return this.licenseService.rejectLicensePayment(user.sub, id, dto);
  }

  @Get('owner/license/current')
  @Roles(SystemRole.OWNER, SystemRole.SUPER_ADMIN)
  currentLicense(@CurrentUser() user: CurrentUserPayload) {
    return this.licenseService.current(user.sub);
  }

  @Post('owner/license/payment-confirmation')
  @Roles(SystemRole.OWNER, SystemRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  async paymentConfirmation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLicensePaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Bukti pembayaran wajib diunggah');
    }
    const uploaded = await this.uploadsService.uploadPaymentProof(file, 'system');
    dto.proofUrl = uploaded.storageKey;
    
    return this.licenseService.createLicensePaymentConfirmation(user.sub, dto);
  }

  @Get('member/license/current')
  @Roles(SystemRole.MEMBER, SystemRole.OWNER, SystemRole.SUPER_ADMIN)
  memberCurrentLicense(@CurrentUser() user: CurrentUserPayload) {
    return this.licenseService.current(user.sub);
  }

  @Post('member/license/payment-confirmation')
  @Roles(SystemRole.MEMBER, SystemRole.OWNER, SystemRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  async memberPaymentConfirmation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLicensePaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Bukti pembayaran wajib diunggah');
    }
    const uploaded = await this.uploadsService.uploadPaymentProof(file, 'system');
    dto.proofUrl = uploaded.storageKey;
    
    return this.licenseService.createLicensePaymentConfirmation(user.sub, dto);
  }
}
