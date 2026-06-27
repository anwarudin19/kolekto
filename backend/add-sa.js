const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const email = 'admin2@kolekto.local';
  const pass = 'GantiPasswordKuat123!';
  const hash = await bcrypt.hash(pass, 10);
  
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash, isSuperAdmin: true, role: 'SUPER_ADMIN' },
    create: {
      email,
      passwordHash: hash,
      fullName: 'Super Admin 2',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isSuperAdmin: true,
    }
  });
  console.log(`Berhasil menambahkan Super Admin:\nEmail: ${email}\nPassword: ${pass}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
