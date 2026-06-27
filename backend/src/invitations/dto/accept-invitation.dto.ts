import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class AcceptInvitationDto {
    @ApiProperty({ example: 'CBP-2026-AB3D' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    @IsString()
    @Length(6, 24)
    inviteCode!: string;
}
