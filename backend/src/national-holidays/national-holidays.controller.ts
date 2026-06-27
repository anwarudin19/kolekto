import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateNationalHolidayDto } from './dto/create-national-holiday.dto';
import { ListNationalHolidaysDto } from './dto/list-national-holidays.dto';
import { SyncNationalHolidaysDto } from './dto/sync-national-holidays.dto';
import { UpdateNationalHolidayDto } from './dto/update-national-holiday.dto';
import { NationalHolidaysService } from './national-holidays.service';

@ApiTags('national-holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.SUPER_ADMIN)
@Controller('national-holidays')
export class NationalHolidaysController {
    constructor(private readonly nationalHolidaysService: NationalHolidaysService) { }

    @Get()
    list(@Query() query: ListNationalHolidaysDto) {
        return this.nationalHolidaysService.list(query);
    }

    @Post('sync')
    sync(@CurrentUser() user: CurrentUserPayload, @Body() dto: SyncNationalHolidaysDto) {
        return this.nationalHolidaysService.syncFromExternal(user.sub, dto.year);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.nationalHolidaysService.findOne(id);
    }

    @Post()
    create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateNationalHolidayDto) {
        return this.nationalHolidaysService.create(user.sub, dto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: UpdateNationalHolidayDto,
    ) {
        return this.nationalHolidaysService.update(id, user.sub, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        return this.nationalHolidaysService.remove(id, user.sub);
    }
}
