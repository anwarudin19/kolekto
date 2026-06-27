import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ApprovePaymentConfirmationDto {
  @ApiPropertyOptional({ example: 'Approved from admin panel' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  note?: string;
}
