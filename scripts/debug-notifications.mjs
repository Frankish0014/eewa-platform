#!/usr/bin/env node
/**
 * Debug helper: creates a student + mentor, makes a mentor request,
 * then prints notifications for both users.
 *
 * Requires: API running on BASE_URL (default http://localhost:3001)
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const rnd = Date.now();
  const studentEmail = `student${rnd}@eewa.dev`;
  const mentorEmail = `mentor${rnd}@eewa.dev`;
  const pass = 'TestPassword1!';

  const sReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: studentEmail, password: pass, role: 'Student', firstName: 'Stu', lastName: 'Dent' }),
  });
  const mReg = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: mentorEmail, password: pass, role: 'Mentor', firstName: 'Men', lastName: 'Tor' }),
  });
  const sDevice = sReg.body?.deviceToken;
  const mDevice = mReg.body?.deviceToken;
  if (!sDevice || !mDevice) {
    throw new Error('Register must return deviceToken for login (email OTP trusted device)');
  }

  const sLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: studentEmail, password: pass, deviceToken: sDevice }),
  });
  const mLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: mentorEmail, password: pass, deviceToken: mDevice }),
  });
  if (!sLogin.body?.accessToken || !mLogin.body?.accessToken) {
    throw new Error(`Login failed: student=${sLogin.status}, mentor=${mLogin.status}`);
  }

  const sAuth = { Authorization: `Bearer ${sLogin.body.accessToken}` };
  const mAuth = { Authorization: `Bearer ${mLogin.body.accessToken}` };

  const sectors = await request('/api/sectors');
  const sectorId = sectors.body?.sectors?.[0]?.id;
  if (!sectorId) throw new Error('No sectors returned from /api/sectors');

  const upsertMentorProfile = await request('/api/mentor/profile', {
    method: 'PATCH',
    headers: mAuth,
    body: JSON.stringify({ bio: 'bio', maxMentees: 5, isActive: true, sectorIds: [sectorId] }),
  });
  if (!upsertMentorProfile.ok) throw new Error(`Mentor profile upsert failed: ${upsertMentorProfile.status}`);

  const proj = await request('/api/projects', {
    method: 'POST',
    headers: sAuth,
    body: JSON.stringify({ sectorId, title: `Test Venture ${rnd}`, description: 'desc' }),
  });
  const projectId = proj.body?.project?.id;
  if (!projectId) throw new Error(`Project create failed: ${proj.status}`);

  const mentors = await request(`/api/mentors?sectorId=${encodeURIComponent(sectorId)}`, { headers: sAuth });
  const mentorProfileId = mentors.body?.mentors?.[0]?.id;
  if (!mentorProfileId) throw new Error('No mentors returned after creating mentor profile');

  const mr = await request(`/api/projects/${projectId}/mentor-requests`, {
    method: 'POST',
    headers: sAuth,
    body: JSON.stringify({ mentorId: mentorProfileId }),
  });
  console.log('mentor_request', mr.status, mr.body);

  const student = await prisma.user.findUnique({ where: { email: studentEmail }, select: { id: true } });
  const mentor = await prisma.user.findUnique({ where: { email: mentorEmail }, select: { id: true } });
  const sNotifs = await prisma.notification.findMany({ where: { userId: student.id }, orderBy: { createdAt: 'desc' } });
  const mNotifs = await prisma.notification.findMany({ where: { userId: mentor.id }, orderBy: { createdAt: 'desc' } });

  console.log('student_notifications', sNotifs.map((n) => ({ type: n.type, title: n.title })));
  console.log('mentor_notifications', mNotifs.map((n) => ({ type: n.type, title: n.title })));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

