import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class JoinTeamDto {
  @ApiPropertyOptional({ example: 'KLP-2026-AB3D', description: 'Kode tim yang dibagikan pemilik/admin.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  @Length(6, 24)
  teamCode?: string;

  @ApiPropertyOptional({
    example: 'KLP-2026-AB3D',
    description: 'Alias lama untuk kompatibilitas. Masih diterima sementara.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  @Length(6, 24)
  inviteCode?: string;
}
