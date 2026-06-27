import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    SystemRole,
    TeamMemberStatus,
} from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { generateInviteCode } from 'src/common/utils/invite-code';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamsService } from 'src/teams/teams.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CancelInvitationDto } from './dto/cancel-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationRecord, InvitationStatuses, InvitationStatusValue } from './invitation.constants';

@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(
        private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly licenseAccessService: LicenseAccessService,
  ) { }

    private get teamInvitationRepo() {
        return (this.prisma as PrismaService & {
            teamInvitation: {
                create: (...args: any[]) => Promise<any>;
                findMany: (...args: any[]) => Promise<any[]>;
                findUnique: (...args: any[]) => Promise<any>;
                update: (...args: any[]) => Promise<any>;
                updateMany: (...args: any[]) => Promise<any>;
            };
        }).teamInvitation;
    }

    async create(teamId: string, actorId: string, dto: CreateInvitationDto) {
        await this.licenseAccessService.ensureTeamWriteAllowed(teamId);
        await this.ensureAdminPrivileges(teamId, actorId);
        this.validateInvitationContact(dto);
        await this.assertRoleBelongsToTeam(teamId, dto.roleId);

        const inviteCode = await this.generateUniqueInvitationCode(teamId);
        const invitation = await this.teamInvitationRepo.create({
            data: {
                teamId,
                roleId: dto.roleId,
                invitedName: dto.invitedName,
                invitedEmail: dto.invitedEmail,
                invitedPhone: dto.invitedPhone,
                inviteCode,
                invitedBy: actorId,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
            },
        });

        await this.auditLogsService.create({
            teamId,
            userId: actorId,
            action: 'CREATE_INVITATION',
            entityType: 'TeamInvitation',
            entityId: invitation.id,
            description: `Undangan dibuat untuk ${dto.invitedName}`,
            metadata: {
                roleId: dto.roleId,
                invitedEmail: dto.invitedEmail,
                invitedPhone: dto.invitedPhone,
                expiresAt: dto.expiresAt ?? null,
            },
        });

        return {
            id: invitation.id,
            inviteCode: invitation.inviteCode,
            inviteLink: this.buildInviteLink(invitation.inviteCode),
            status: invitation.status,
        };
    }

    async list(teamId: string, actorId: string, status?: InvitationStatusValue) {
        await this.ensureAdminPrivileges(teamId, actorId);
        await this.expirePendingInvitations(teamId);

        return this.teamInvitationRepo.findMany({
            where: {
                teamId,
                ...(status ? { status } : {}),
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        feeAmount: true,
                        periodType: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                accepter: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async preview(inviteCode: string) {
        const normalizedCode = this.normalizeJoinCode(inviteCode);
        const invitation = await this.findInvitationByCode(normalizedCode);

        if (invitation) {
            const refreshed = await this.refreshExpiredInvitation(invitation);
            return {
                kind: 'INVITATION' as const,
                teamName: refreshed.team.name,
                invitedName: refreshed.invitedName,
                roleName: refreshed.role?.name ?? null,
                status: refreshed.status,
                expiresAt: refreshed.expiresAt,
                invitedEmail: this.maskEmail(refreshed.invitedEmail),
                invitedPhone: this.maskPhone(refreshed.invitedPhone),
            };
        }

        const team = await this.findTeamByCode(normalizedCode);
        if (team) {
            return {
                kind: 'TEAM_CODE' as const,
                teamName: team.name,
                invitedName: team.name,
                roleName: null,
                status: InvitationStatuses.PENDING,
                expiresAt: null,
                invitedEmail: null,
                invitedPhone: null,
            };
        }

        throw new NotFoundException('Kode tidak valid');
    }

    async accept(dtoUserId: string, dto: AcceptInvitationDto) {
        return this.acceptByCode(dtoUserId, dto.inviteCode);
    }

    async acceptByCode(userId: string, inviteCode: string) {
        const normalizedCode = this.normalizeJoinCode(inviteCode);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User tidak ditemukan');
        }

        const invitation = await this.findInvitationByCode(normalizedCode);
        if (!invitation) {
            const team = await this.findTeamByCode(normalizedCode);
            if (!team) {
                throw new NotFoundException('Kode tidak valid');
            }

            const membership = await this.teamsService.join(userId, { teamCode: normalizedCode } as any);
            await this.notifyTeamAdmins(team.id, userId, user.fullName);

            return {
                teamId: team.id,
                teamName: team.name,
                systemRole: membership.systemRole,
                status: membership.status,
            };
        }

        const refreshed = await this.refreshExpiredInvitation(invitation);
        this.ensureInvitationUsable(refreshed);

        const existingMembership = await this.prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: refreshed.teamId,
                    userId,
                },
            },
        });

        if (existingMembership) {
            throw new ConflictException('Anda sudah menjadi anggota tim ini');
        }

        const { member } = await this.prisma.$transaction(async (tx) => {
            const member = await tx.teamMember.create({
                data: {
                    teamId: refreshed.teamId,
                    userId,
                    roleId: refreshed.roleId,
                    memberName: user.fullName,
                    phoneNumber: user.phoneNumber ?? refreshed.invitedPhone,
                    systemRole: SystemRole.MEMBER,
                    status: TeamMemberStatus.ACTIVE,
                    joinedAt: new Date(),
                },
            });

            await (tx as typeof tx & { teamInvitation: { update: (...args: any[]) => Promise<any> } }).teamInvitation.update({
                where: { id: refreshed.id },
                data: {
                    status: InvitationStatuses.ACCEPTED,
                    acceptedBy: userId,
                    acceptedAt: new Date(),
                },
            });

            await tx.activityLog.create({
                data: {
                    teamId: refreshed.teamId,
                    userId,
                    action: 'ACCEPT_INVITATION',
                    entityType: 'TeamInvitation',
                    entityId: refreshed.id,
                    description: `${user.fullName} menerima undangan tim`,
                    metadata: {
                        inviteCode: refreshed.inviteCode,
                        roleId: refreshed.roleId,
                        memberId: member.id,
                    },
                },
            });

            return { member };
        });

        await this.notifyTeamAdmins(refreshed.teamId, userId, user.fullName);

        return {
            teamId: refreshed.teamId,
            teamName: refreshed.team.name,
            systemRole: member.systemRole,
            status: member.status,
        };
    }

    async cancel(teamId: string, invitationId: string, actorId: string, dto: CancelInvitationDto) {
        await this.ensureAdminPrivileges(teamId, actorId);

        const invitation = await this.teamInvitationRepo.findUnique({
            where: { id: invitationId },
        });

        if (!invitation || invitation.teamId !== teamId) {
            throw new NotFoundException('Undangan tidak ditemukan');
        }

        const refreshed = await this.refreshExpiredInvitationBasic(invitation);
        if (refreshed.status === InvitationStatuses.ACCEPTED) {
            throw new BadRequestException('Undangan yang sudah diterima tidak dapat dibatalkan');
        }
        if (refreshed.status === InvitationStatuses.CANCELLED) {
            throw new BadRequestException('Undangan sudah dibatalkan');
        }
        if (refreshed.status === InvitationStatuses.EXPIRED) {
            throw new BadRequestException('Undangan sudah kedaluwarsa');
        }

        await this.teamInvitationRepo.update({
            where: { id: invitationId },
            data: {
                status: InvitationStatuses.CANCELLED,
            },
        });

        await this.auditLogsService.create({
            teamId,
            userId: actorId,
            action: 'CANCEL_INVITATION',
            entityType: 'TeamInvitation',
            entityId: invitationId,
            description: `Undangan ${refreshed.invitedName} dibatalkan`,
            metadata: dto.reason ? { reason: dto.reason } : undefined,
        });

        return {
            message: 'Undangan berhasil dibatalkan',
        };
    }

    async assertInvitationCanBeAccepted(inviteCode: string) {
        const normalizedCode = this.normalizeJoinCode(inviteCode);
        const invitation = await this.findInvitationByCode(normalizedCode);
        if (invitation) {
            const refreshed = await this.refreshExpiredInvitation(invitation);
            this.ensureInvitationUsable(refreshed);
            return refreshed;
        }

        const team = await this.findTeamByCode(normalizedCode);
        if (!team) {
            throw new NotFoundException('Kode tidak valid');
        }

        return team;
    }

    private async ensureAdminPrivileges(teamId: string, actorId: string) {
        const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);
        if (membership.systemRole !== SystemRole.OWNER && membership.systemRole !== SystemRole.ADMIN) {
            throw new ForbiddenException('Hanya owner atau admin yang dapat mengelola undangan');
        }
    }

    private validateInvitationContact(dto: CreateInvitationDto) {
        if (!dto.invitedName?.trim()) {
            throw new BadRequestException('Nama calon anggota wajib diisi');
        }

        if (!dto.invitedEmail && !dto.invitedPhone) {
            throw new BadRequestException('Email atau nomor HP calon anggota wajib diisi');
        }
    }

    private async assertRoleBelongsToTeam(teamId: string, roleId?: string) {
        if (!roleId) {
            return;
        }

        const role = await this.prisma.role.findUnique({ where: { id: roleId } });
        if (!role || role.teamId !== teamId) {
            throw new NotFoundException('Role undangan tidak ditemukan pada tim ini');
        }
    }

    private async generateUniqueInvitationCode(teamId: string): Promise<string> {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            select: {
                name: true,
            },
        });

        if (!team) {
            throw new NotFoundException('Tim tidak ditemukan');
        }

        const teamCode = this.buildTeamNameAbbreviation(team.name);
        const yearCode = new Date().getFullYear().toString();

        for (let attempt = 0; attempt < 10; attempt += 1) {
            const randomSuffix = generateInviteCode(4);
            const inviteCode = `${teamCode}-${yearCode}-${randomSuffix}`;
            const existing = await this.teamInvitationRepo.findUnique({
                where: { inviteCode },
                select: { id: true },
            });

            if (!existing) {
                return inviteCode;
            }
        }

        this.logger.error('Gagal membuat inviteCode undangan yang unik setelah beberapa percobaan');
        throw new ConflictException('Gagal membuat kode undangan. Silakan coba lagi.');
    }

    private buildTeamNameAbbreviation(teamName: string): string {
        const normalizedWords = teamName
            .toUpperCase()
            .replace(/[^A-Z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

        if (!normalizedWords.length) {
            return 'TEAM';
        }

        const initials = normalizedWords.map((word) => word[0]).join('');
        if (initials.length >= 3) {
            return initials.slice(0, 4);
        }

        return normalizedWords.join('').slice(0, 4).padEnd(3, 'X');
    }

    private buildInviteLink(inviteCode: string): string {
        const webUrl = this.configService.get<string | undefined>('app.webUrl');

        if (!webUrl) {
            return `/invite/${inviteCode}`;
        }

        return `${webUrl.replace(/\/$/, '')}/invite/${inviteCode}`;
    }

    private normalizeJoinCode(inviteCode: string) {
        return inviteCode.trim().toUpperCase();
    }

    private async expirePendingInvitations(teamId: string) {
        await this.teamInvitationRepo.updateMany({
            where: {
                teamId,
                status: InvitationStatuses.PENDING,
                expiresAt: {
                    lt: new Date(),
                },
            },
            data: {
                status: InvitationStatuses.EXPIRED,
            },
        });
    }

    private async findInvitationByCode(inviteCode?: string): Promise<InvitationRecord | null> {
        if (!inviteCode) {
            return null;
        }

        return this.teamInvitationRepo.findUnique({
            where: { inviteCode },
            include: {
                team: true,
                role: true,
            },
        });
    }

    private async findInvitationByCodeOrThrow(inviteCode: string): Promise<InvitationRecord> {
        const invitation = await this.findInvitationByCode(this.normalizeJoinCode(inviteCode));
        if (!invitation) {
            throw new NotFoundException('Kode undangan tidak valid');
        }

        return invitation;
    }

    private async findTeamByCode(inviteCode?: string) {
        if (!inviteCode) {
            return null;
        }

        return this.prisma.team.findUnique({
            where: { inviteCode },
            select: {
                id: true,
                name: true,
                ownerId: true,
            },
        });
    }

    private ensureInvitationUsable(invitation: InvitationRecord) {
        if (invitation.status === InvitationStatuses.EXPIRED) {
            throw new BadRequestException('Undangan sudah kedaluwarsa');
        }

        if (invitation.status === InvitationStatuses.CANCELLED) {
            throw new BadRequestException('Undangan sudah dibatalkan');
        }

        if (invitation.status === InvitationStatuses.ACCEPTED) {
            throw new BadRequestException('Undangan sudah digunakan');
        }

        if (invitation.status !== InvitationStatuses.PENDING) {
            throw new BadRequestException('Undangan tidak dapat digunakan');
        }
    }

    private async refreshExpiredInvitation(invitation: InvitationRecord): Promise<InvitationRecord> {
        if (invitation.status !== InvitationStatuses.PENDING || !invitation.expiresAt) {
            return invitation;
        }

        if (invitation.expiresAt.getTime() >= Date.now()) {
            return invitation;
        }

        return this.teamInvitationRepo.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatuses.EXPIRED,
            },
            include: {
                team: true,
                role: true,
            },
        });
    }

    private async refreshExpiredInvitationBasic(
        invitation: {
            id: string;
            invitedName: string;
            teamId: string;
            status: InvitationStatusValue;
            expiresAt: Date | null;
        },
    ) {
        if (invitation.status !== InvitationStatuses.PENDING || !invitation.expiresAt) {
            return invitation;
        }

        if (invitation.expiresAt.getTime() >= Date.now()) {
            return invitation;
        }

        return this.teamInvitationRepo.update({
            where: { id: invitation.id },
            data: {
                status: InvitationStatuses.EXPIRED,
            },
        });
    }

    private async notifyTeamAdmins(teamId: string, joinedUserId: string, memberName: string) {
        const admins = await this.prisma.teamMember.findMany({
            where: {
                teamId,
                status: TeamMemberStatus.ACTIVE,
                systemRole: {
                    in: [SystemRole.OWNER, SystemRole.ADMIN],
                },
                userId: {
                    not: joinedUserId,
                },
            },
            select: {
                userId: true,
            },
        });

        await Promise.all(
            admins.map((admin) =>
                this.notificationsService.create({
                    userId: admin.userId,
                    teamId,
                    type: 'INVITATION_ACCEPTED',
                    title: 'Anggota baru bergabung',
                    message: `${memberName} telah bergabung ke tim`,
                    data: {
                        memberName,
                    },
                }),
            ),
        );
    }

    private maskEmail(email?: string | null): string | null {
        if (!email) {
            return null;
        }

        const [localPart, domain] = email.split('@');
        if (!domain) {
            return null;
        }

        const visible = localPart.slice(0, 2);
        return `${visible}${'*'.repeat(Math.max(localPart.length - visible.length, 2))}@${domain}`;
    }

    private maskPhone(phone?: string | null): string | null {
        if (!phone) {
            return null;
        }

        if (phone.length <= 5) {
            return `${phone.slice(0, 1)}***${phone.slice(-1)}`;
        }

        return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
    }
}
