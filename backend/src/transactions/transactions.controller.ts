import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { AdminQueryDto } from 'src/admin/dto/admin-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { TransactionsService } from './transactions.service';

const PROOF_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
const MAX_PROOF_FILES = Number(process.env.UPLOAD_MAX_PROOF_FILES ?? 5);

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('teams/:teamId/transactions')
  @UseGuards(TeamMembershipGuard)
  list(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AdminQueryDto,
  ) {
    return this.transactionsService.list(teamId, user.sub, query);
  }

  @Post('teams/:teamId/transactions/expense')
  @UseGuards(TeamMembershipGuard)
  @UseInterceptors(FilesInterceptor('proofs', MAX_PROOF_FILES, {
    limits: { fileSize: PROOF_UPLOAD_LIMIT_BYTES },
  }))
  @ApiConsumes('multipart/form-data')
  createExpense(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExpenseDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.transactionsService.createExpense(teamId, user.sub, dto, files);
  }

  @Get('transactions/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.findOne(id, user.sub);
  }

  @Get('transactions/:id/proof-urls')
  getProofUrls(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.getProofUrls(id, user.sub);
  }

  @Get('transactions/:id/proof-url')
  getProofUrl(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.getProofUrl(id, user.sub);
  }
}
