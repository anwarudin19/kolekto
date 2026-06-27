import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Kas Operasional' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: AccountType, example: AccountType.CASH })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({ example: 'Bank Central Asia' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
