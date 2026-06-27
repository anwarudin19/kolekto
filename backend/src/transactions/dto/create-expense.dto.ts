import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: 120000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'Pembelian kebutuhan operasional', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ format: 'uuid', required: false, description: 'ID kategori transaksi' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
