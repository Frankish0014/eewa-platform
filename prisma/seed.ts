/**
 * Seed: creates an initial Admin user for development.
 * Run: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@eewa.dev';
const ADMIN_PASSWORD = 'AdminPassword1!';

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: 'Admin',
      firstName: 'Admin',
      lastName: 'User',
    },
    update: {},
  });
  console.log('Seeded admin user:', ADMIN_EMAIL, '(password:', ADMIN_PASSWORD, ')');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
