import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTeamMemberStatusDto {
  @ApiProperty({ enum: TeamMemberStatus, example: TeamMemberStatus.INACTIVE })
  @IsEnum(TeamMemberStatus)
  status!: TeamMemberStatus;
}
