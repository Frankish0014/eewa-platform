/**
 * Point this repo at .githooks/ so commit-msg (etc.) run automatically.
 * Safe no-op when not inside a git work tree or when git is unavailable.
 */
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
try {
  execSync('git rev-parse --git-dir', { cwd: root, stdio: 'ignore' });
  execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'ignore' });
} catch {
  // Not a clone, or git missing — ignore
}
