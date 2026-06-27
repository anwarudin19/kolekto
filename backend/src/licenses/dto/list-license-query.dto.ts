import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { LicensePaymentStatus, LicenseStatus } from '@prisma/client';

export class ListLicensesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'owner@kolekto.local' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: LicenseStatus })
  @IsOptional()
  @IsString()
  status?: LicenseStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  planId?: string;
}

export class ListLicensePaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'owner@kolekto.local' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: LicensePaymentStatus })
  @IsOptional()
  @IsString()
  status?: LicensePaymentStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  licenseId?: string;
}
