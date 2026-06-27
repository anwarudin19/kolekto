import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidayType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNationalHolidayDto {
    @ApiProperty({
        example: '2026-08-17',
        description: 'Tanggal hari libur nasional dalam format YYYY-MM-DD.',
    })
    @IsDateString({}, { message: 'holidayDate harus berupa tanggal yang valid' })
    holidayDate!: string;

    @ApiProperty({
        example: 'Hari Kemerdekaan Republik Indonesia',
        description: 'Nama hari libur nasional.',
    })
    @IsString({ message: 'name harus berupa teks' })
    @MaxLength(120, { message: 'name maksimal 120 karakter' })
    name!: string;

    @ApiPropertyOptional({
        enum: ['NATIONAL', 'CUTI_BERSAMA'],
        default: 'NATIONAL',
        description: 'Tipe hari libur: NATIONAL (libur nasional) atau CUTI_BERSAMA.',
    })
    @IsOptional()
    @IsEnum(HolidayType, { message: 'type harus NATIONAL atau CUTI_BERSAMA' })
    type?: HolidayType;
}
