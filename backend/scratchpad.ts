import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const JWT_SECRET = 'zHpbKi0Vk7qnS0BE7nXhaBc4nzg4v9F8mWU1jmD9Go3Wz6XAHf292fi6LISqNf'; // From .env

async function run() {
  try {
    // 1. Find an owner
    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER' },
    });

    if (!owner) {
      console.log('Tidak ada OWNER ditemukan di database.');
      return;
    }

    console.log(`Ditemukan Owner: ${owner.email}`);

    // 2. Sign JWT
    const payload = {
      sub: owner.id,
      email: owner.email,
      role: owner.role,
      isSuperAdmin: owner.isSuperAdmin,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    console.log('Berhasil membuat JWT Token.');

    // 3. Create a dummy file
    const dummyFilePath = path.join(__dirname, 'dummy-proof.png');
    fs.writeFileSync(dummyFilePath, 'dummy image content');

    // 4. Send FormData Request
    // Note: Node.js 18+ has native fetch and FormData
    const formData = new FormData();
    formData.append('amount', '99000');
    formData.append('note', 'Simulasi dari Scratchpad');
    
    // Convert file to Blob
    const fileBuffer = fs.readFileSync(dummyFilePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', blob, 'dummy-proof.png');

    console.log('Mengirim request ke API...');
    const response = await fetch('http://localhost:3000/api/owner/license/payment-confirmation', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    console.log(`Status Code: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`Response Body: ${text}`);

    // Cleanup
    fs.unlinkSync(dummyFilePath);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
