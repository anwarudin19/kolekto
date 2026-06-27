const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['wayan@aaa.com', 'nisa@aaa.com'] } },
    include: {
      teamMembers: {
        include: { team: true }
      }
    }
  });
  console.dir(users, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
