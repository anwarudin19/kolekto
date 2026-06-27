import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'member@kolekto.local' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'Nama Member' })
    @IsString()
    @MaxLength(120)
    fullName!: string;

    @ApiPropertyOptional({ example: '08123456789' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phoneNumber?: string;

    @ApiProperty({ minLength: 8, example: 'Password123!' })
    @IsString()
    @MinLength(8)
    password!: string;

    @ApiPropertyOptional({ enum: SystemRole, default: SystemRole.MEMBER })
    @IsOptional()
    @IsEnum(SystemRole)
    role?: SystemRole;

    @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}
