import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'member-update@kolekto.local' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'Nama Member Update' })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    fullName?: string;

    @ApiPropertyOptional({ example: '08123456789', nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phoneNumber?: string | null;
}