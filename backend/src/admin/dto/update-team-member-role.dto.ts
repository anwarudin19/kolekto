import { ApiProperty } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTeamMemberRoleDto {
  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'TREASURER', 'MEMBER'] })
  @IsEnum(SystemRole)
  role!: SystemRole;
}
