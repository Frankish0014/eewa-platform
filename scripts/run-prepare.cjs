/**
 * Skips git-hook setup in Docker/CI so `npm ci` does not require `.git` or hook scripts early.
 * Locally, runs ensure-git-hooks.
 */
'use strict';
if (process.env.DOCKER_BUILD === '1' || process.env.CI === 'true') {
  process.exit(0);
}
const { execSync } = require('child_process');
const path = require('path');
const hookScript = path.join(__dirname, 'ensure-git-hooks.cjs');
execSync(`node "${hookScript}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
