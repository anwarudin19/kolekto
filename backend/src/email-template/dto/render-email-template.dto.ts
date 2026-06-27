import { IsObject, IsOptional, IsString } from 'class-validator';

export class RenderEmailTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsOptional()
  @IsString()
  textBody?: string | null;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
