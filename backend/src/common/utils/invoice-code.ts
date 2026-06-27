import { PrismaService } from 'src/prisma/prisma.service';
import { buildTeamNameAbbreviation } from './invite-code';

export const generateInvoiceCode = async (
  prisma: PrismaService,
  teamId: string,
  teamName: string,
  periodDate: Date,
): Promise<string> => {
  const yyyy = periodDate.getUTCFullYear();
  const mm = String(periodDate.getUTCMonth() + 1).padStart(2, '0');
  const teamCode = buildTeamNameAbbreviation(teamName);
  const prefix = `INV-${teamCode}-${yyyy}${mm}-`;

  const existingCount = await prisma.contributionInvoice.count({
    where: {
      teamId,
      invoiceCode: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}${String(existingCount + 1).padStart(4, '0')}`;
};
