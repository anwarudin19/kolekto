import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole, TeamMemberStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({ example: 'Nama Anggota' })
  @IsString()
  memberName!: string;

  @ApiPropertyOptional({ example: '+628123456789' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ enum: SystemRole, example: SystemRole.MEMBER })
  @IsEnum(SystemRole)
  systemRole!: SystemRole;

  @ApiProperty({ enum: TeamMemberStatus, example: TeamMemberStatus.ACTIVE })
  @IsEnum(TeamMemberStatus)
  status!: TeamMemberStatus;
}
