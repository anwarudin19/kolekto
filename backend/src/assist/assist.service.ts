import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { AssistGuestService, AssistResponse } from './assist-guest.service';
import { AssistPolicyService } from './assist-policy.service';
import { AssistTeamService } from './assist-team.service';
import { AskAssistDto } from './dto/ask-assist.dto';
import { GuestAssistDto } from './dto/guest-assist.dto';

@Injectable()
export class AssistService {
  constructor(
    private readonly guestService: AssistGuestService,
    private readonly teamService: AssistTeamService,
    private readonly policyService: AssistPolicyService,
  ) { }

  guest(dto: GuestAssistDto): AssistResponse {
    return this.guestService.answer(dto.message);
  }

  async ask(user: CurrentUserPayload, dto: AskAssistDto): Promise<AssistResponse> {
    const access = await this.policyService.ensureTeamAccess(dto.teamId, user.sub);
    return this.teamService.answer(access, dto.message);
  }
}
