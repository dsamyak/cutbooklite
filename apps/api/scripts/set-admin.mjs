/**
 * One-shot script to grant admin access to an owner by email.
 *
 * Usage (from apps/api directory):
 *   node scripts/set-admin.mjs samyakds777@gmail.com
 *
 * Run once, then delete or keep for future use.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config(); // load .env

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin.mjs <email>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.owner.findUnique({ where: { email } });

  if (!owner) {
    console.error(`❌ No owner found with email: ${email}`);
    process.exit(1);
  }

  await prisma.owner.update({
    where: { email },
    data: { is_admin: true }
  });

  console.log(`✅ Admin access granted to: ${owner.name} (${email})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
