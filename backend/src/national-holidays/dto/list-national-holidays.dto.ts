import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListNationalHolidaysDto {
    @ApiPropertyOptional({
        example: 2026,
        description: 'Opsional. Filter daftar hari libur berdasarkan tahun.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'year harus berupa angka bulat' })
    @Min(2000, { message: 'year minimal 2000' })
    @Max(2100, { message: 'year maksimal 2100' })
    year?: number;
}
