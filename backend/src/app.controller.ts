import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { formatWibTimestamp } from './common/utils/timezone';

@ApiTags('health')
@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'kolekto-backend',
      timestamp: formatWibTimestamp(),
    };
  }
}
