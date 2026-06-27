import { BadRequestException } from '@nestjs/common';
import { SystemRole, TeamMemberStatus } from '@prisma/client';

import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { ConfigService } from '@nestjs/config';
import { InvitationsService } from './invitations.service';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamsService } from 'src/teams/teams.service';

describe('InvitationsService', () => {
  const user = {
    id: 'user-1',
    fullName: 'Budi Santoso',
    phoneNumber: null,
  };

  const acceptedInvitation = {
    id: 'inv-1',
    teamId: 'team-1',
    roleId: 'role-1',
    invitedName: 'Rina',
    invitedEmail: 'rina@example.com',
    invitedPhone: null,
    inviteCode: 'TEAM-2026-ABCD',
    status: 'ACCEPTED',
    invitedBy: 'owner-1',
    acceptedBy: 'user-2',
    acceptedAt: new Date('2026-05-15T00:00:00.000Z'),
    expiresAt: null,
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-15T00:00:00.000Z'),
    team: {
      id: 'team-1',
      name: 'Tim Demo',
      ownerId: 'owner-1',
    },
    role: {
      id: 'role-1',
      name: 'Anggota',
      feeAmount: 0,
      periodType: 'MONTHLY',
    },
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    teamInvitation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const service = new InvitationsService(
    prismaMock,
    {
      ensureActiveMembership: jest.fn(),
    } as unknown as TeamsService,
    {
      create: jest.fn(),
    } as unknown as AuditLogsService,
    {
      create: jest.fn(),
    } as unknown as NotificationsService,
    {
      get: jest.fn(),
    } as unknown as ConfigService,
    {
      ensureTeamWriteAllowed: jest.fn(),
    } as unknown as LicenseAccessService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(user);
    (prismaMock.teamMember.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaMock.teamInvitation.findUnique as jest.Mock).mockResolvedValue(acceptedInvitation);
  });

  it('menolak undangan yang sudah digunakan', async () => {
    await expect(service.assertInvitationCanBeAccepted('TEAM-2026-ABCD')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.acceptByCode('user-1', 'TEAM-2026-ABCD')).rejects.toThrow('Undangan sudah digunakan');
  });

  it.each([
    ['EXPIRED', 'Undangan sudah kedaluwarsa'],
    ['CANCELLED', 'Undangan sudah dibatalkan'],
  ] as const)('menolak undangan berstatus %s', async (status, message) => {
    (prismaMock.teamInvitation.findUnique as jest.Mock).mockResolvedValue({
      ...acceptedInvitation,
      status,
    });

    await expect(service.assertInvitationCanBeAccepted('TEAM-2026-ABCD')).rejects.toThrow(message);
    await expect(service.acceptByCode('user-1', 'TEAM-2026-ABCD')).rejects.toThrow(message);
  });

  it('tetap bisa memproses undangan pending', async () => {
    (prismaMock.teamInvitation.findUnique as jest.Mock).mockResolvedValueOnce({
      ...acceptedInvitation,
      status: 'PENDING',
      acceptedBy: null,
      acceptedAt: null,
    });
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (handler: (tx: any) => Promise<unknown>) =>
      handler({
        teamMember: {
          create: jest.fn().mockResolvedValue({
            id: 'member-1',
            systemRole: SystemRole.MEMBER,
            status: TeamMemberStatus.ACTIVE,
          }),
        },
        teamInvitation: {
          update: jest.fn().mockResolvedValue({
            ...acceptedInvitation,
            status: 'ACCEPTED',
          }),
        },
        activityLog: {
          create: jest.fn().mockResolvedValue(null),
        },
      }),
    );

    await expect(service.assertInvitationCanBeAccepted('TEAM-2026-ABCD')).resolves.toMatchObject({
      status: 'PENDING',
    });
  });
});
