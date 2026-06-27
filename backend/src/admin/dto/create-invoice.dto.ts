import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'team-uuid' })
  @IsUUID()
  teamId!: string;

  @ApiProperty({ example: 'member-user-uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'role-uuid' })
  @IsUUID()
  roleId!: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  periodDate!: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ enum: ['DRAFT', 'UNPAID', 'PARTIAL', 'PAID', 'EXPIRED', 'OVERDUE', 'CANCELLED'], example: 'DRAFT' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
