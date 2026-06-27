import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { createUtcDate, startOfDayUtc } from 'src/common/utils/date';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNationalHolidayDto } from './dto/create-national-holiday.dto';
import { ListNationalHolidaysDto } from './dto/list-national-holidays.dto';
import { UpdateNationalHolidayDto } from './dto/update-national-holiday.dto';

@Injectable()
export class NationalHolidaysService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogsService: AuditLogsService,
    ) { }

    private get holidayRepo() {
        return (this.prisma as PrismaService & {
            nationalHoliday: {
                findMany: (...args: any[]) => Promise<any[]>;
                findUnique: (...args: any[]) => Promise<any | null>;
                findFirst: (...args: any[]) => Promise<any | null>;
                create: (...args: any[]) => Promise<any>;
                update: (...args: any[]) => Promise<any>;
                delete: (...args: any[]) => Promise<any>;
            };
        }).nationalHoliday;
    }

    async list(query: ListNationalHolidaysDto) {
        const where = query.year
            ? {
                holidayDate: {
                    gte: createUtcDate(query.year, 0, 1),
                    lt: createUtcDate(query.year + 1, 0, 1),
                },
            }
            : undefined;

        return this.holidayRepo.findMany({
            where,
            orderBy: [{ holidayDate: 'asc' }, { createdAt: 'asc' }],
        } as any);
    }

    async findOne(id: string) {
        const holiday = await this.holidayRepo.findUnique({ where: { id } } as any);
        if (!holiday) {
            throw new NotFoundException('Hari libur nasional tidak ditemukan');
        }

        return holiday;
    }

    async create(actorId: string, dto: CreateNationalHolidayDto) {
        const holidayDate = this.normalizeHolidayDate(dto.holidayDate);
        await this.ensureHolidayDateAvailable(holidayDate);

        const holiday = await this.holidayRepo.create({
            data: {
                holidayDate,
                name: dto.name.trim(),
                type: dto.type ?? 'NATIONAL',
            },
        } as any);

        await this.auditLogsService.create({
            userId: actorId,
            action: 'NATIONAL_HOLIDAY_CREATED',
            entityType: 'NationalHoliday',
            entityId: holiday.id,
            description: `Hari libur nasional ${holiday.name} ditambahkan`,
            metadata: {
                holidayDate: holiday.holidayDate,
                name: holiday.name,
            },
        });

        return holiday;
    }

    async update(id: string, actorId: string, dto: UpdateNationalHolidayDto) {
        const existingHoliday = await this.findOne(id);
        const holidayDate = dto.holidayDate
            ? this.normalizeHolidayDate(dto.holidayDate)
            : existingHoliday.holidayDate;

        await this.ensureHolidayDateAvailable(holidayDate, id);

        const holiday = await this.holidayRepo.update({
            where: { id },
            data: {
                holidayDate,
                name: dto.name?.trim() ?? existingHoliday.name,
                type: dto.type ?? existingHoliday.type,
            },
        } as any);

        await this.auditLogsService.create({
            userId: actorId,
            action: 'NATIONAL_HOLIDAY_UPDATED',
            entityType: 'NationalHoliday',
            entityId: holiday.id,
            description: `Hari libur nasional ${holiday.name} diperbarui`,
            metadata: {
                before: {
                    holidayDate: existingHoliday.holidayDate,
                    name: existingHoliday.name,
                },
                after: {
                    holidayDate: holiday.holidayDate,
                    name: holiday.name,
                },
            },
        });

        return holiday;
    }

    async remove(id: string, actorId: string) {
        const existingHoliday = await this.findOne(id);
        const holiday = await this.holidayRepo.delete({ where: { id } } as any);

        await this.auditLogsService.create({
            userId: actorId,
            action: 'NATIONAL_HOLIDAY_DELETED',
            entityType: 'NationalHoliday',
            entityId: holiday.id,
            description: `Hari libur nasional ${existingHoliday.name} dihapus`,
            metadata: {
                holidayDate: existingHoliday.holidayDate,
                name: existingHoliday.name,
            },
        });

        return {
            message: 'Hari libur nasional berhasil dihapus',
            data: holiday,
        };
    }

    // Sumber data libur nasional + cuti bersama Indonesia (JSON statis, andal di GitHub raw).
    private static readonly HOLIDAY_SOURCE =
        'https://raw.githubusercontent.com/guangrei/APIHariLibur_V2/main/calendar.json';

    async syncFromExternal(actorId: string, year?: number) {
        const source = NationalHolidaysService.HOLIDAY_SOURCE;

        let calendar: Record<string, { summary?: string[] | string; holiday?: boolean }>;
        try {
            const res = await fetch(source);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            calendar = await res.json();
        } catch {
            throw new ServiceUnavailableException(
                'Gagal mengambil data hari libur dari sumber eksternal. Coba lagi nanti.',
            );
        }

        // Hanya entri yang benar-benar libur (holiday: true). Yang false ("Perayaan") dilewati.
        const entries = Object.entries(calendar)
            .filter(([date, info]) => info?.holiday === true && /^\d{4}-\d{2}-\d{2}$/.test(date))
            .filter(([date]) => !year || date.startsWith(`${year}-`));

        let created = 0;
        let updated = 0;
        let unchanged = 0;

        for (const [dateStr, info] of entries) {
            const holidayDate = this.normalizeHolidayDate(dateStr);
            const name =
                (Array.isArray(info.summary) ? info.summary.join(', ') : String(info.summary ?? '')).trim() ||
                'Hari libur nasional';
            const type = /cuti bersama/i.test(name) ? 'CUTI_BERSAMA' : 'NATIONAL';

            const existing = await this.holidayRepo.findUnique({ where: { holidayDate } } as any);
            if (!existing) {
                await this.holidayRepo.create({ data: { holidayDate, name, type } } as any);
                created++;
            } else if (existing.name !== name || existing.type !== type) {
                await this.holidayRepo.update({ where: { id: existing.id }, data: { name, type } } as any);
                updated++;
            } else {
                unchanged++;
            }
        }

        await this.auditLogsService.create({
            userId: actorId,
            action: 'NATIONAL_HOLIDAY_SYNCED',
            entityType: 'NationalHoliday',
            description: `Sinkronisasi hari libur nasional${year ? ` tahun ${year}` : ''}: ${created} baru, ${updated} diperbarui, ${unchanged} tetap`,
            metadata: { source, year: year ?? null, total: entries.length, created, updated, unchanged },
        });

        return { source, year: year ?? null, total: entries.length, created, updated, unchanged };
    }

    private normalizeHolidayDate(value: string) {
        return startOfDayUtc(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
    }

    private async ensureHolidayDateAvailable(holidayDate: Date, excludeId?: string) {
        const existingHoliday = await this.holidayRepo.findFirst({
            where: {
                holidayDate,
                ...(excludeId
                    ? {
                        id: {
                            not: excludeId,
                        },
                    }
                    : {}),
            },
            select: {
                id: true,
            },
        } as any);

        if (existingHoliday) {
            throw new ConflictException('Tanggal hari libur nasional sudah terdaftar');
        }
    }
}
