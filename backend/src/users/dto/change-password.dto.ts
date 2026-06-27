import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({ minLength: 8, example: 'PasswordLama123!' })
    @IsString()
    @MinLength(8)
    currentPassword!: string;

    @ApiProperty({ minLength: 8, example: 'PasswordBaru123!' })
    @IsString()
    @MinLength(8)
    newPassword!: string;
}