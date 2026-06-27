import { BadGatewayException, Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateType, EmailLogStatus } from '@prisma/client';
import { EmailTemplateService, RenderedEmailTemplate } from 'src/email-template/email-template.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailTransportService } from './mail.transport.service';

type SendEmailInput = {
  to: string;
  type: EmailTemplateType;
  context: Record<string, unknown>;
  templateId: string | null;
  templateVersion: number | null;
  subject: string;
  html: string;
  text?: string | null;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly transport: MailTransportService,
    @Inject(forwardRef(() => EmailTemplateService))
    private readonly templates: EmailTemplateService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetPasswordEmail(params: { to: string; name: string; resetUrl: string; expiresMinutes: number }) {
    return this.sendTemplatedEmail('RESET_PASSWORD', params.to, {
      name: params.name,
      resetUrl: params.resetUrl,
      expiresMinutes: params.expiresMinutes,
    });
  }

  async sendVerifyEmail(params: { to: string; name: string; verifyUrl: string; expiresMinutes: number }) {
    return this.sendTemplatedEmail('VERIFY_EMAIL', params.to, {
      name: params.name,
      verifyUrl: params.verifyUrl,
      expiresMinutes: params.expiresMinutes,
    });
  }

  async sendInvoiceReminderEmail(params: {
    to: string;
    name: string;
    teamName: string;
    invoiceNumber: string;
    amount: string;
    dueDate: string;
    paymentUrl: string;
  }) {
    return this.sendTemplatedEmail('INVOICE_REMINDER', params.to, {
      name: params.name,
      teamName: params.teamName,
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
      dueDate: params.dueDate,
      paymentUrl: params.paymentUrl,
    });
  }

  async sendPaymentConfirmedEmail(params: {
    to: string;
    name: string;
    teamName: string;
    amount: string;
    paidAt: string;
  }) {
    return this.sendTemplatedEmail('PAYMENT_CONFIRMED', params.to, {
      name: params.name,
      teamName: params.teamName,
      amount: params.amount,
      paidAt: params.paidAt,
      historyUrl: `${this.frontendBaseUrl()}/dashboard`,
    });
  }

  async sendTeamInvitationEmail(params: {
    to: string;
    name: string;
    teamName: string;
    inviteUrl: string;
    invitedBy: string;
  }) {
    return this.sendTemplatedEmail('TEAM_INVITATION', params.to, {
      name: params.name,
      teamName: params.teamName,
      inviteUrl: params.inviteUrl,
      invitedBy: params.invitedBy,
    });
  }

  async sendLicenseExpiringEmail(params: {
    to: string;
    name: string;
    teamName: string;
    expiredAt: string;
    planName: string;
  }) {
    return this.sendTemplatedEmail('LICENSE_EXPIRING', params.to, {
      name: params.name,
      teamName: params.teamName,
      expiredAt: params.expiredAt,
      planName: params.planName,
      renewUrl: `${this.frontendBaseUrl()}/license`,
    });
  }

  async sendRenderedEmail(
    type: EmailTemplateType,
    to: string,
    rendered: RenderedEmailTemplate,
  ) {
    return this.dispatchEmail({
      to,
      type,
      context: rendered.context,
      templateId: rendered.templateId,
      templateVersion: rendered.templateVersion,
      subject: rendered.subject,
      html: rendered.htmlBody,
      text: rendered.textBody,
    });
  }

  async sendCustomEmail(
    type: EmailTemplateType,
    to: string,
    payload: { subject: string; htmlBody: string; textBody?: string | null; context?: Record<string, unknown>; templateId?: string | null; templateVersion?: number | null },
  ) {
    return this.dispatchEmail({
      to,
      type,
      context: payload.context ?? {},
      templateId: payload.templateId ?? null,
      templateVersion: payload.templateVersion ?? null,
      subject: payload.subject,
      html: payload.htmlBody,
      text: payload.textBody ?? null,
    });
  }

  private async sendTemplatedEmail(
    type: EmailTemplateType,
    to: string,
    context: Record<string, unknown>,
  ) {
    const rendered = await this.templates.renderForType(type, context);
    return this.sendRenderedEmail(type, to, rendered);
  }

  private async dispatchEmail(input: SendEmailInput) {
    const log = await this.prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        type: input.type,
        templateId: input.templateId,
        templateVersion: input.templateVersion,
        status: EmailLogStatus.PENDING,
        provider: 'brevo',
      },
    });

    try {
      const result = await this.transport.sendMail({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text ?? undefined,
      });

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailLogStatus.SENT,
          messageId: result.messageId ?? null,
        },
      });

      return {
        success: true,
        messageId: result.messageId ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim email';
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: EmailLogStatus.FAILED,
          error: message.slice(0, 1000),
        },
      });

      this.logger.error(`Gagal mengirim email ${input.type} ke ${input.to}: ${message}`);
      throw new BadGatewayException('Email gagal dikirim melalui provider');
    }
  }

  private frontendBaseUrl(): string {
    return (
      this.configService.get<string>('app.frontendUrl')
      || this.configService.get<string>('app.webUrl')
      || 'http://localhost:3002'
    );
  }
}
