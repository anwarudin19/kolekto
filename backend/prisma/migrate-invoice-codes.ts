import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function buildTeamNameAbbreviation(teamName: string): string {
  const normalizedWords = teamName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!normalizedWords.length) return 'TEAM';

  const initials = normalizedWords.map((word) => word[0]).join('');
  if (initials.length >= 3) return initials.slice(0, 4);

  return normalizedWords.join('').slice(0, 4).padEnd(3, 'X');
}

// Matches old format: INV-YYYYMM-XXXX (no team code segment)
const OLD_FORMAT = /^INV-\d{6}-\d{4}$/;

async function main() {
  const invoices = await prisma.contributionInvoice.findMany({
    where: { invoiceCode: { startsWith: 'INV-' } },
    select: {
      id: true,
      invoiceCode: true,
      team: { select: { name: true } },
    },
  });

  const toUpdate = invoices.filter((inv) => OLD_FORMAT.test(inv.invoiceCode));

  if (!toUpdate.length) {
    console.log('Tidak ada tagihan dengan format lama. Selesai.');
    return;
  }

  console.log(`Ditemukan ${toUpdate.length} tagihan yang perlu diupdate...\n`);

  let updated = 0;
  let failed = 0;

  for (const invoice of toUpdate) {
    const parts = invoice.invoiceCode.split('-');
    if (parts.length !== 3) {
      console.warn(`  SKIP  ${invoice.invoiceCode} — format tidak dikenali`);
      failed++;
      continue;
    }

    const [, yyyymm, seq] = parts;
    const teamCode = buildTeamNameAbbreviation(invoice.team.name);
    const newCode = `INV-${teamCode}-${yyyymm}-${seq}`;

    try {
      await prisma.contributionInvoice.update({
        where: { id: invoice.id },
        data: { invoiceCode: newCode },
      });
      console.log(`  OK    ${invoice.invoiceCode}  →  ${newCode}`);
      updated++;
    } catch (err) {
      console.error(`  FAIL  ${invoice.invoiceCode}  →  ${newCode} :`, (err as Error).message);
      failed++;
    }
  }

  console.log(`\nSelesai: ${updated} diupdate, ${failed} gagal/dilewati`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
