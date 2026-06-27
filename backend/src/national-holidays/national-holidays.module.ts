import { Module } from '@nestjs/common';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { NationalHolidaysController } from './national-holidays.controller';
import { NationalHolidaysService } from './national-holidays.service';

@Module({
    imports: [AuditLogsModule],
    controllers: [NationalHolidaysController],
    providers: [NationalHolidaysService],
    exports: [NationalHolidaysService],
})
export class NationalHolidaysModule { }
