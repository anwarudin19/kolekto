import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ enum: ['DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'EXPIRED', 'OVERDUE', 'CANCELLED'], example: 'CANCELLED' })
  @IsEnum(InvoiceStatus)
  status!: InvoiceStatus;
}
