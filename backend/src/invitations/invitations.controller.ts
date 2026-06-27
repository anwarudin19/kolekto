import {
    Body,
    Controller,
    Get,
    Param,
    ParseEnumPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TeamMembershipGuard } from 'src/common/guards/team-membership.guard';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CancelInvitationDto } from './dto/cancel-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationStatuses, InvitationStatusValue } from './invitation.constants';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller('teams')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    @Post(':teamId/invitations')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, TeamMembershipGuard)
    create(
        @Param('teamId') teamId: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateInvitationDto,
    ) {
        return this.invitationsService.create(teamId, user.sub, dto);
    }

    @Get(':teamId/invitations')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, TeamMembershipGuard)
    list(
        @Param('teamId') teamId: string,
        @CurrentUser() user: CurrentUserPayload,
        @Query('status', new ParseEnumPipe(InvitationStatuses, { optional: true })) status?: InvitationStatusValue,
    ) {
        return this.invitationsService.list(teamId, user.sub, status);
    }

    @Post('invitations/accept')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    accept(@CurrentUser() user: CurrentUserPayload, @Body() dto: AcceptInvitationDto) {
        return this.invitationsService.acceptByCode(user.sub, dto.inviteCode);
    }

    @Patch(':teamId/invitations/:invitationId/cancel')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, TeamMembershipGuard)
    cancel(
        @Param('teamId') teamId: string,
        @Param('invitationId') invitationId: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CancelInvitationDto,
    ) {
        return this.handleCancel(teamId, invitationId, user, dto);
    }

    @Post(':teamId/invitations/:invitationId/cancel')
    @ApiExcludeEndpoint()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, TeamMembershipGuard)
    cancelLegacy(
        @Param('teamId') teamId: string,
        @Param('invitationId') invitationId: string,
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CancelInvitationDto,
    ) {
        return this.handleCancel(teamId, invitationId, user, dto);
    }

    private handleCancel(
        teamId: string,
        invitationId: string,
        user: CurrentUserPayload,
        dto: CancelInvitationDto,
    ) {
        return this.invitationsService.cancel(teamId, invitationId, user.sub, dto);
    }

    @Get('invitations/preview/:inviteCode')
    preview(@Param('inviteCode') inviteCode: string) {
        return this.invitationsService.preview(inviteCode);
    }
}
