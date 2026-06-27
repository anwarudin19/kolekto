import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectPaymentDto {
  @ApiProperty({ example: 'Bukti pembayaran belum sesuai' })
  @IsString()
  @MinLength(3)
  rejectedReason!: string;
}
