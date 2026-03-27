#!/bin/sh
set -e
cd /app
export DATABASE_URL="$(node scripts/normalize-database-url.cjs)"
node scripts/prisma-deploy.cjs
exec node dist/server.js
