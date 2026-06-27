import { ApiProperty } from '@nestjs/swagger';
import { TeamStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTeamStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], example: 'INACTIVE' })
  @IsEnum(TeamStatus)
  status!: TeamStatus;
}
