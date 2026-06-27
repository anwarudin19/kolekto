import { ApiProperty } from '@nestjs/swagger';
import { PeriodType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Koordinator Operasional' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 75000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  feeAmount!: number;

  @ApiProperty({ enum: PeriodType, example: PeriodType.MONTHLY })
  @IsEnum(PeriodType)
  periodType!: PeriodType;

  @ApiProperty({
    required: false,
    example: 25,
    description: 'Opsional. Override tanggal jatuh tempo bulanan untuk role ini (1-31).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'invoiceDueDay harus berupa angka bulat' })
  @Min(1, { message: 'invoiceDueDay minimal 1' })
  @Max(31, { message: 'invoiceDueDay maksimal 31' })
  invoiceDueDay?: number;
}
