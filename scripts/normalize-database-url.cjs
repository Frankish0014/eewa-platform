'use strict';
/**
 * Strips BOM/whitespace and wrapping quotes from DATABASE_URL (common copy/paste issues).
 * Validates postgres URL prefix. Exits 1 with a clear message if invalid.
 * Writes the normalized URL to stdout (no trailing newline issues for URLs with query strings).
 */
let url = process.env.DATABASE_URL || '';
url = url.replace(/^\uFEFF/, '').trim();
if (
  (url.startsWith('"') && url.endsWith('"')) ||
  (url.startsWith("'") && url.endsWith("'"))
) {
  url = url.slice(1, -1).trim();
}
if (!url) {
  console.error(
    'ERROR: DATABASE_URL is missing or empty.\n' +
      'On Render: open your Web Service → Environment → add DATABASE_URL.\n' +
      'Use your Neon (or Postgres) connection string, e.g. postgresql://user:pass@host/db?sslmode=require\n' +
      'Do not wrap the value in quotes in the Render UI.',
  );
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.error(
    'ERROR: DATABASE_URL must start with postgresql:// or postgres://\n' +
      'First characters (debug):',
    JSON.stringify(url.slice(0, 48)),
  );
  process.exit(1);
}
process.stdout.write(url);
