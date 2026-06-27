import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.SUPER_ADMIN, SystemRole.OWNER, SystemRole.ADMIN, SystemRole.TREASURER, SystemRole.MEMBER)
@Controller('plans')
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list(@Query() query: ListPlansQueryDto) {
    return this.plansService.list({
      ...query,
      isActive: true,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findActiveById(id);
  }
}
