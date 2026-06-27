import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInvitationDto {
    @ApiProperty({ example: 'Budi Santoso' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @MaxLength(100)
    invitedName!: string;

    @ApiPropertyOptional({ example: 'budi@email.com' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsOptional()
    @IsEmail()
    invitedEmail?: string;

    @ApiPropertyOptional({ example: '08123456789' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsOptional()
    @IsString()
    @MaxLength(30)
    invitedPhone?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    roleId?: string;

    @ApiPropertyOptional({
        example: '2026-05-04T17:00:00.000Z',
        description: 'Opsional. Jika diisi, undangan tidak dapat dipakai setelah waktu ini.',
    })
    @IsOptional()
    @IsISO8601()
    expiresAt?: string;
}
