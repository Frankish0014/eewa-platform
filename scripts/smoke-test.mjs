#!/usr/bin/env node
/**
 * Smoke-test key API endpoints on a running server.
 * Usage: npm run smoke-test
 *        BASE_URL=https://api.example.com npm run smoke-test
 * Requires: server running; seeded admin (admin@eewa.dev / AdminPassword1!)
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

function log(msg, ok = null) {
  const s = ok === true ? '✓' : ok === false ? '✗' : '';
  console.log(s ? `${s} ${msg}` : msg);
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log(`Smoke-testing: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  // 1. Health
  try {
    const { ok, status } = await request('/api/health');
    if (ok && status === 200) {
      log('GET /api/health', true);
      passed++;
    } else {
      log(`GET /api/health → ${status}`, false);
      failed++;
    }
  } catch (e) {
    log(`GET /api/health failed: ${e.message}`, false);
    failed++;
  }

  // 2. Admin ping
  try {
    const { ok, status, body } = await request('/api/admin/ping');
    if (ok && status === 200 && body?.ok === true) {
      log('GET /api/admin/ping', true);
      passed++;
    } else {
      log(`GET /api/admin/ping → ${status}`, false);
      failed++;
    }
  } catch (e) {
    log(`GET /api/admin/ping failed: ${e.message}`, false);
    failed++;
  }

  // 3. Login
  let token = null;
  try {
    const { ok, status, body } = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@eewa.dev',
        password: 'AdminPassword1!',
      }),
    });
    if (ok && status === 200 && body?.accessToken) {
      token = body.accessToken;
      log('POST /api/auth/login (admin)', true);
      passed++;
    } else {
      log(`POST /api/auth/login → ${status} (seed admin may be missing)`, false);
      failed++;
    }
  } catch (e) {
    log(`POST /api/auth/login failed: ${e.message}`, false);
    failed++;
  }

  if (token) {
    const auth = { Authorization: `Bearer ${token}` };

    // 4. Verified opportunities (any authenticated user)
    try {
      const { ok, status, body } = await request('/api/opportunities', { headers: auth });
      if (ok && status === 200 && Array.isArray(body?.opportunities)) {
        log('GET /api/opportunities (with auth)', true);
        passed++;
      } else {
        log(`GET /api/opportunities → ${status}`, false);
        failed++;
      }
    } catch (e) {
      log(`GET /api/opportunities failed: ${e.message}`, false);
      failed++;
    }

    // 5. Admin ventures overview
    try {
      const { ok, status, body } = await request('/api/admin/ventures-overview', { headers: auth });
      if (ok && status === 200 && body?.overview && typeof body.overview.total === 'number') {
        log('GET /api/admin/ventures-overview', true);
        passed++;
      } else {
        log(`GET /api/admin/ventures-overview → ${status}`, false);
        failed++;
      }
    } catch (e) {
      log(`GET /api/admin/ventures-overview failed: ${e.message}`, false);
      failed++;
    }

    // 6. Provider ventures overview (admin must get 403 – route exists, RBAC works)
    try {
      const { status } = await request('/api/provider/ventures-overview', { headers: auth });
      if (status === 403) {
        log('GET /api/provider/ventures-overview (403 as admin)', true);
        passed++;
      } else {
        log(`GET /api/provider/ventures-overview → ${status} (expected 403)`, false);
        failed++;
      }
    } catch (e) {
      log(`GET /api/provider/ventures-overview failed: ${e.message}`, false);
      failed++;
    }
  }

  console.log('\n' + `Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
