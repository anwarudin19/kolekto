import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTransactionCategoryDto {
  @ApiProperty({ example: 'Operasional' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    enum: TransactionType,
    required: false,
    description: 'Kosongkan jika kategori berlaku untuk pemasukan maupun pengeluaran',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
