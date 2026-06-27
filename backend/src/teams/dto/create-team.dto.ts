import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Tim Operasional' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Nama tim wajib diisi' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Tim untuk mengelola operasional harian', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: 25,
    description: 'Opsional. Tanggal jatuh tempo default per bulan untuk seluruh tim (1-31).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'defaultInvoiceDueDay harus berupa angka bulat' })
  @Min(1, { message: 'defaultInvoiceDueDay minimal 1' })
  @Max(31, { message: 'defaultInvoiceDueDay maksimal 31' })
  defaultInvoiceDueDay?: number;
}
