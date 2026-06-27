import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

export type OutboundMail = {
  to: string;
  subject: string;
  html: string;
  text?: string | null;
};

@Injectable()
export class MailTransportService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendMail(payload: OutboundMail): Promise<{ messageId?: string }> {
    const from = this.configService.get<string>('SMTP_FROM', 'Kolekto <noreply@kolekto.id>');
    const result = await this.mailerService.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? undefined,
    });

    return { messageId: result.messageId };
  }
}
