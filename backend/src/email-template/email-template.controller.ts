import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmailTemplateType, SystemRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { MailService } from 'src/mail/mail.service';
import { EmailTemplateService } from './email-template.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { RenderEmailTemplateDto } from './dto/render-email-template.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as SystemRole;

@ApiTags('email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SUPER_ADMIN_ROLE)
@Controller('email-templates')
export class EmailTemplateController {
  constructor(
    private readonly templates: EmailTemplateService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  list(@Query('type') type?: EmailTemplateType) {
    return this.templates.list(type);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.templates.findById(id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEmailTemplateDto) {
    return this.templates.createDraft(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.templates.updateDraft(id, dto, user.sub);
  }

  @Post(':id/preview')
  async preview(
    @Param('id') id: string,
    @Body() dto: RenderEmailTemplateDto,
  ) {
    return this.templates.preview(id, {
      subject: dto.subject,
      htmlBody: dto.htmlBody,
      textBody: dto.textBody,
    }, dto.context);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.templates.publish(id, user.sub);
  }

  @Post(':id/rollback')
  rollback(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.templates.rollback(id, user.sub);
  }

  @Post(':id/send-test')
  async sendTest(
    @Param('id') id: string,
    @Body() dto: SendTestEmailDto,
  ) {
    const rendered = await this.templates.preview(id, {
      subject: dto.subject,
      htmlBody: dto.htmlBody,
      textBody: dto.textBody,
    }, dto.context);

    return this.mailService.sendCustomEmail(rendered.template.type, dto.to, {
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
      context: rendered.context,
      templateId: rendered.template.id,
      templateVersion: rendered.template.version,
    });
  }
}
