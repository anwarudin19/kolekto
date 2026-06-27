import { EmailTemplateType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @IsEnum(EmailTemplateType, { message: 'Tipe template email tidak valid' })
  type!: EmailTemplateType;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama template minimal 2 karakter' })
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  textBody?: string | null;
}
