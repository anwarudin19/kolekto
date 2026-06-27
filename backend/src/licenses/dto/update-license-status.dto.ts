import { ApiProperty } from '@nestjs/swagger';
import { LicenseStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateLicenseStatusDto {
  @ApiProperty({ enum: LicenseStatus })
  @IsEnum(LicenseStatus)
  status!: LicenseStatus;
}
