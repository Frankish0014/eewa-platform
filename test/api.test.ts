/**
 * API integration tests for critical paths.
 * Requires: DATABASE_URL and other .env vars; run `npm run db:seed` first.
 * Run: npm test
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import request from 'supertest';
import { app, prisma } from '../src/app';

const api = request(app);

async function run(): Promise<void> {
  // Health (no auth)
  await api.get('/api/health').expect(200);

  // Admin ping (no auth)
  const ping = await api.get('/api/admin/ping').expect(200);
  if (!ping.body?.ok) throw new Error('Expected admin ping { ok: true }');

  // Trust a device so login skips email OTP (integration test)
  const deviceToken = 'eewa-api-test-trusted-device-token-fixed-value';
  const tokenHash = createHash('sha256').update(deviceToken, 'utf8').digest('hex');
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@eewa.dev' } });
  if (!adminUser) throw new Error('Seed admin missing — run npm run db:seed');
  await prisma.trustedDevice.upsert({
    where: { userId_tokenHash: { userId: adminUser.id, tokenHash } },
    create: { userId: adminUser.id, tokenHash },
    update: {},
  });

  const login = await api
    .post('/api/auth/login')
    .send({ email: 'admin@eewa.dev', password: 'AdminPassword1!', deviceToken })
    .expect(200);
  const token = login.body?.accessToken;
  if (!token) throw new Error('Expected accessToken from login');

  // Verified opportunities (any authenticated user)
  const opp = await api
    .get('/api/opportunities')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  if (!Array.isArray(opp.body?.opportunities)) throw new Error('Expected opportunities array');

  // Opportunities with sector filter
  await api
    .get('/api/opportunities?sectorId=non-existent-id')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  // Admin ventures overview
  const vent = await api
    .get('/api/admin/ventures-overview')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  if (vent.body?.overview == null || typeof vent.body.overview.total !== 'number') {
    throw new Error('Expected overview with total');
  }

  // Unauthenticated opportunities list → 401
  await api.get('/api/opportunities').expect(401);

  // Provider ventures overview (admin gets 403 – route exists, RBAC works)
  await api
    .get('/api/provider/ventures-overview')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
}

run()
  .then(async () => {
    await prisma.$disconnect();
    console.log('API tests passed');
    process.exit(0);
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    console.error('API test failed:', e.message || e);
    process.exit(1);
  });
