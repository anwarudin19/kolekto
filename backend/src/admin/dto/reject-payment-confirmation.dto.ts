import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectPaymentConfirmationDto {
  @ApiProperty({ example: 'Bukti transfer tidak valid' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
