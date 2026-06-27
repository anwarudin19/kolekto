import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class RunEodDto {
  @ApiPropertyOptional({ example: '2026-04-28' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Run manual dari Web Admin Panel' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
