import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateUserPasswordDto {
    @ApiProperty({ minLength: 8, example: 'PasswordBaru123!' })
    @IsString()
    @MinLength(8)
    newPassword!: string;
}