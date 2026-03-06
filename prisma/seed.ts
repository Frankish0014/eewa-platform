/**
 * Seed: Admin user + Sectors for projects.
 * Run: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@eewa.dev';
const ADMIN_PASSWORD = 'AdminPassword1!';

const SECTORS = [
  { name: 'Technology', description: 'Software, hardware, and digital services' },
  { name: 'Agriculture', description: 'Farming, agribusiness, and food security' },
  { name: 'Healthcare', description: 'Health tech, medical devices, and wellness' },
  { name: 'Education', description: 'EdTech, training, and learning platforms' },
  { name: 'Finance', description: 'Fintech, microfinance, and financial inclusion' },
  { name: 'Clean Energy', description: 'Renewable energy and sustainability' },
  { name: 'E-commerce', description: 'Online retail and marketplaces' },
  { name: 'Manufacturing', description: 'Production and industrial processes' },
  { name: 'Creative', description: 'Arts, media, and creative industries' },
  { name: 'Other', description: 'Other sectors' },
];

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

  for (const s of SECTORS) {
    await prisma.sector.upsert({
      where: { name: s.name },
      create: s,
      update: { description: s.description },
    });
  }
  console.log('Seeded', SECTORS.length, 'sectors');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
