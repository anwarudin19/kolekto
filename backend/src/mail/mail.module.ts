import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailTemplateModule } from 'src/email-template/email-template.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailService } from './mail.service';
import { MailTransportService } from './mail.transport.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => EmailTemplateModule),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SMTP_HOST', 'smtp-relay.brevo.com'),
          port: configService.get<number>('SMTP_PORT', 587),
          secure: configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: configService.get<string>('SMTP_USER', ''),
            pass: configService.get<string>('SMTP_PASS', ''),
          },
        },
        defaults: {
          from: configService.get<string>('SMTP_FROM', 'Kolekto <noreply@kolekto.id>'),
        },
      }),
    }),
  ],
  providers: [MailService, MailTransportService],
  exports: [MailService, MailTransportService],
})
export class MailModule {}
