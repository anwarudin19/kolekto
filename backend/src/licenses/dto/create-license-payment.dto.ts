import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateLicensePaymentDto {
  @ApiProperty({ example: 99000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/proof.png' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  proofUrl?: string;

  @ApiPropertyOptional({ example: 'Transfer via BCA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiPropertyOptional({ example: '2026-04-28T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}
