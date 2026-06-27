import { ApiProperty } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'TREASURER', 'MEMBER'], example: 'ADMIN' })
  @IsEnum(SystemRole)
  role!: SystemRole;
}
