import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Basic' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'BASIC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 99000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTeams!: number;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMembers!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowReminder!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowExport!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowAuditLog!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  allowCustomBranding!: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
