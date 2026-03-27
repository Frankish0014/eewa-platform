'use strict';
/**
 * Runs `prisma migrate deploy`. If it fails with P3005 (non-empty DB without migration
 * history — typical after `db push`), and EEWA_AUTO_BASELINE_MIGRATION is set,
 * runs `migrate resolve --applied <name>` once then retries deploy.
 *
 * For a brand-new empty database, leave EEWA_AUTO_BASELINE_MIGRATION unset.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const appRoot = path.join(__dirname, '..');
const prismaCli = path.join(appRoot, 'node_modules', 'prisma', 'build', 'index.js');

function migrateDeploy() {
  return spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: appRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
}

function migrateResolve(appliedName) {
  const r = spawnSync(process.execPath, [prismaCli, 'migrate', 'resolve', '--applied', appliedName], {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const first = migrateDeploy();
process.stdout.write(first.stdout || '');
process.stderr.write(first.stderr || '');
if (first.status === 0) process.exit(0);

const out = `${first.stderr || ''}\n${first.stdout || ''}`;

if (out.includes('P3005') && process.env.EEWA_AUTO_BASELINE_MIGRATION) {
  const name = process.env.EEWA_AUTO_BASELINE_MIGRATION.trim();
  console.warn(`[eewa] P3005: baselining migration "${name}" (EEWA_AUTO_BASELINE_MIGRATION); retrying migrate deploy…`);
  migrateResolve(name);
  const second = migrateDeploy();
  process.stdout.write(second.stdout || '');
  process.stderr.write(second.stderr || '');
  if (second.status !== 0) process.exit(second.status ?? 1);
  process.exit(0);
}

process.exit(first.status ?? 1);
