export const InvitationStatuses = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
} as const;

export type InvitationStatusValue =
    (typeof InvitationStatuses)[keyof typeof InvitationStatuses];

export type InvitationRecord = {
    id: string;
    teamId: string;
    roleId: string | null;
    invitedName: string;
    invitedEmail: string | null;
    invitedPhone: string | null;
    inviteCode: string;
    status: InvitationStatusValue;
    invitedBy: string;
    acceptedBy: string | null;
    acceptedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    team: {
        id: string;
        name: string;
        ownerId: string;
    };
    role: {
        id: string;
        name: string;
        feeAmount: unknown;
        periodType: string;
    } | null;
};
