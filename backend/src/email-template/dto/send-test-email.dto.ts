import { IsEmail } from 'class-validator';
import { RenderEmailTemplateDto } from './render-email-template.dto';

export class SendTestEmailDto extends RenderEmailTemplateDto {
  @IsEmail({}, { message: 'Email tujuan tidak valid' })
  to!: string;
}
