import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectLicensePaymentDto {
  @ApiProperty({ example: 'Bukti pembayaran tidak valid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  rejectedReason!: string;
}
