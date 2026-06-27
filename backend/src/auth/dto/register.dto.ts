import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Nama Pengguna' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'Nama Pengguna', description: 'Alias snake_case dari fullName' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: '+628123456789' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'Password123!',
    description: 'Konfirmasi password dalam format camelCase',
  })
  @IsOptional()
  @IsString()
  passwordConfirmation?: string;

  @ApiPropertyOptional({
    example: 'Password123!',
    description: 'Konfirmasi password dalam format snake_case',
  })
  @IsOptional()
  @IsString()
  password_confirmation?: string;

  @ApiPropertyOptional({ example: '+628123456789', description: 'Alias snake_case dari phoneNumber' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'CBP-2026-AB3D', description: 'Kode undangan tim opsional' })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
