import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export enum BillingRunScope {
    ALL = 'ALL',
    TEAM = 'TEAM',
}

export class RunBillingSchedulerDto {
    @ApiPropertyOptional({
        example: '2026-04-27T23:55:00.000Z',
        description: 'Opsional. Tanggal acuan untuk simulasi/manual trigger proses billing EOD.',
    })
    @IsOptional()
    @IsDateString({}, { message: 'triggerDate harus berupa tanggal yang valid' })
    triggerDate?: string;

    @ApiPropertyOptional({
        enum: BillingRunScope,
        default: BillingRunScope.ALL,
        description: 'Scope billing manual: ALL untuk semua tim, TEAM untuk tim tertentu.',
    })
    @IsOptional()
    @IsEnum(BillingRunScope, { message: 'scope harus ALL atau TEAM' })
    scope?: BillingRunScope;

    @ApiPropertyOptional({
        example: '11111111-2222-3333-4444-555555555555',
        description: 'Wajib diisi jika scope=TEAM.',
    })
    @ValidateIf((value: RunBillingSchedulerDto) => value.scope === BillingRunScope.TEAM)
    @IsUUID('4', { message: 'teamId harus berupa UUID yang valid' })
    teamId?: string;
}
