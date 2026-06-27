import { PartialType } from '@nestjs/swagger';
import { CreateNationalHolidayDto } from './create-national-holiday.dto';

export class UpdateNationalHolidayDto extends PartialType(CreateNationalHolidayDto) { }
