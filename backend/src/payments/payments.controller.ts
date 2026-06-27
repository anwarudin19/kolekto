import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { PaymentsService } from './payments.service';

const PROOF_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices/:invoiceId/payments')
  @UseInterceptors(FileInterceptor('proof', {
    limits: {
      fileSize: PROOF_UPLOAD_LIMIT_BYTES,
    },
  }))
  @ApiConsumes('multipart/form-data')
  submit(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePaymentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.paymentsService.submit(invoiceId, user.sub, dto, file);
  }

  @Get('teams/:teamId/payments')
  @UseGuards(TeamMembershipGuard)
  list(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AdminQueryDto,
  ) {
    return this.paymentsService.list(teamId, user.sub, query);
  }

  @Post('payments/:paymentId/approve')
  approve(@Param('paymentId') paymentId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.paymentsService.approve(paymentId, user.sub);
  }

  @Post('payments/:paymentId/reject')
  reject(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentsService.reject(paymentId, user.sub, dto);
  }
}
