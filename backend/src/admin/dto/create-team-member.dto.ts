import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole, TeamMemberStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTeamMemberDto {
  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'new.member@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+628123456789' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Budi Member' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  memberName?: string;

  @ApiPropertyOptional({ enum: ['OWNER', 'ADMIN', 'TREASURER', 'MEMBER'] })
  @IsOptional()
  @IsEnum(SystemRole)
  systemRole?: SystemRole;

  @ApiPropertyOptional({ enum: TeamMemberStatus, example: TeamMemberStatus.INVITED })
  @IsOptional()
  @IsEnum(TeamMemberStatus)
  status?: TeamMemberStatus;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
