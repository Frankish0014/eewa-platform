#!/bin/sh
set -e
cd /app
./node_modules/.bin/prisma migrate deploy
exec node dist/server.js
