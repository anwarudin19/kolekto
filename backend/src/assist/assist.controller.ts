import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AssistService } from './assist.service';
import { AskAssistDto } from './dto/ask-assist.dto';
import { GuestAssistDto } from './dto/guest-assist.dto';

@ApiTags('assist')
@Controller('assist')
export class AssistController {
  constructor(private readonly assistService: AssistService) { }

  @Post('guest')
  @ApiOperation({ summary: 'Ask Kola in guest mode without authentication' })
  guest(@Body() dto: GuestAssistDto) {
    return this.assistService.guest(dto);
  }

  @Post('ask')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ask Kola about an authenticated team context' })
  ask(@CurrentUser() user: CurrentUserPayload, @Body() dto: AskAssistDto) {
    return this.assistService.ask(user, dto);
  }
}
