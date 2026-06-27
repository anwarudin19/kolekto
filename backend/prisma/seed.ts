import 'dotenv/config';

import {
  AccountType,
  BillingCycle,
  EmailTemplateStatus,
  EmailTemplateType,
  PeriodType,
  PrismaClient,
  SystemRole,
  LicenseStatus,
  TeamMemberStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_REQUIRED_VARIABLES,
} from '../src/email-template/email-template.constants';

const prisma = new PrismaClient();

const addDaysUtc = (value: Date, days: number): Date => {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

async function main(): Promise<void> {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@kolekto.local';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'GantiPasswordKuat123!';
  const superAdminName = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';
  const ownerTrialDays = Number(process.env.OWNER_TRIAL_DAYS ?? '14');

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      passwordHash,
      fullName: superAdminName,
      role: 'SUPER_ADMIN' as SystemRole,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
    },
    create: {
      email: superAdminEmail,
      passwordHash,
      fullName: superAdminName,
      role: 'SUPER_ADMIN' as SystemRole,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'TRIAL' },
    update: {
      name: 'Trial',
      price: 0,
      billingCycle: BillingCycle.MONTHLY,
      maxTeams: 1,
      maxMembers: 10,
      allowReminder: true,
      allowExport: false,
      allowAuditLog: true,
      allowCustomBranding: false,
      isActive: true,
    },
    create: {
      name: 'Trial',
      code: 'TRIAL',
      price: 0,
      billingCycle: BillingCycle.MONTHLY,
      maxTeams: 1,
      maxMembers: 10,
      allowReminder: true,
      allowExport: false,
      allowAuditLog: true,
      allowCustomBranding: false,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'BASIC' },
    update: {
      name: 'Basic',
      price: 99000,
      billingCycle: BillingCycle.MONTHLY,
      maxTeams: 3,
      maxMembers: 50,
      allowReminder: true,
      allowExport: true,
      allowAuditLog: true,
      allowCustomBranding: false,
      isActive: true,
    },
    create: {
      name: 'Basic',
      code: 'BASIC',
      price: 99000,
      billingCycle: BillingCycle.MONTHLY,
      maxTeams: 3,
      maxMembers: 50,
      allowReminder: true,
      allowExport: true,
      allowAuditLog: true,
      allowCustomBranding: false,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'PRO' },
    update: {
      name: 'Pro',
      price: 199000,
      billingCycle: BillingCycle.YEARLY,
      maxTeams: 10,
      maxMembers: 200,
      allowReminder: true,
      allowExport: true,
      allowAuditLog: true,
      allowCustomBranding: true,
      isActive: true,
    },
    create: {
      name: 'Pro',
      code: 'PRO',
      price: 199000,
      billingCycle: BillingCycle.YEARLY,
      maxTeams: 10,
      maxMembers: 200,
      allowReminder: true,
      allowExport: true,
      allowAuditLog: true,
      allowCustomBranding: true,
      isActive: true,
    },
  });

  const ownerPasswordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash: ownerPasswordHash,
      fullName: 'Admin Demo',
      role: 'OWNER' as SystemRole,
      status: UserStatus.ACTIVE,
    },
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'budi@demo.com' },
    update: {},
    create: {
      email: 'budi@demo.com',
      passwordHash: ownerPasswordHash,
      fullName: 'Budi Santoso',
      role: 'MEMBER' as SystemRole,
      status: UserStatus.ACTIVE,
    },
  });

  const trialPlan = await prisma.plan.findUnique({
    where: { code: 'TRIAL' },
  });

  if (trialPlan) {
    const startDate = new Date();
    const endDate = addDaysUtc(startDate, ownerTrialDays);

    await prisma.ownerLicense.upsert({
      where: { ownerId: owner.id },
      update: {
        planId: trialPlan.id,
        status: LicenseStatus.TRIAL,
        startDate,
        endDate,
        trialEndsAt: endDate,
        autoRenew: false,
      },
      create: {
        ownerId: owner.id,
        planId: trialPlan.id,
        status: LicenseStatus.TRIAL,
        startDate,
        endDate,
        trialEndsAt: endDate,
        autoRenew: false,
      },
    });
  }

  const team = await prisma.team.upsert({
    where: { inviteCode: 'FUTSAL2026' },
    update: {},
    create: {
      name: 'Futsal Squad',
      ownerId: owner.id,
      inviteCode: 'FUTSAL2026',
    },
  });

  const existingRole = await prisma.role.findFirst({
    where: {
      teamId: team.id,
      name: 'Pemain Aktif',
    },
  });

  const roleId = existingRole
    ? existingRole.id
    : (
        await prisma.role.create({
          data: {
            teamId: team.id,
            name: 'Pemain Aktif',
            feeAmount: 50000,
            periodType: PeriodType.MONTHLY,
          },
        })
      ).id;

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: owner.id,
      },
    },
    update: {
      roleId,
      memberName: owner.fullName,
      status: TeamMemberStatus.ACTIVE,
      systemRole: 'OWNER' as SystemRole,
      joinedAt: new Date(),
    },
    create: {
      teamId: team.id,
      userId: owner.id,
      roleId,
      memberName: owner.fullName,
      systemRole: 'OWNER' as SystemRole,
      status: TeamMemberStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: memberUser.id,
      },
    },
    update: {
      roleId,
      memberName: memberUser.fullName,
      status: TeamMemberStatus.ACTIVE,
      systemRole: 'MEMBER' as SystemRole,
      joinedAt: new Date(),
    },
    create: {
      teamId: team.id,
      userId: memberUser.id,
      roleId,
      memberName: memberUser.fullName,
      systemRole: 'MEMBER' as SystemRole,
      status: TeamMemberStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  const existingAccount = await prisma.account.findFirst({
    where: {
      teamId: team.id,
      name: 'Kas Utama',
    },
  });

  let accountId = existingAccount?.id;
  if (!accountId) {
    const acc = await prisma.account.create({
      data: {
        teamId: team.id,
        name: 'Kas Utama',
        type: AccountType.CASH,
      },
    });
    accountId = acc.id;
  }

  // Create Invoice for Budi if not exists
  const invoiceCode = 'INV-DEMO-001';
  const existingInvoice = await prisma.contributionInvoice.findUnique({
    where: { invoiceCode },
  });

  if (!existingInvoice) {
    await prisma.contributionInvoice.create({
      data: {
        invoiceCode,
        teamId: team.id,
        userId: memberUser.id,
        roleId,
        periodDate: new Date(),
        dueDate: addDaysUtc(new Date(), 7),
        amount: 50000,
        status: 'UNPAID',
      },
    });
  }

  for (const type of Object.values(EmailTemplateType)) {
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { type },
      orderBy: { version: 'desc' },
    });

    if (existingTemplate) {
      continue;
    }

    const template = EMAIL_TEMPLATE_DEFAULTS[type];
    await prisma.emailTemplate.create({
      data: {
        type,
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        status: EmailTemplateStatus.PUBLISHED,
        version: 1,
        isActive: true,
        requiredVariables: EMAIL_TEMPLATE_REQUIRED_VARIABLES[type],
      },
    });
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
