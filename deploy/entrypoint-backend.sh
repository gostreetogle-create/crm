#!/bin/sh
set -eu
cd /app

echo "[crm-backend] prisma migrate deploy..."
npx prisma migrate deploy

echo "[crm-backend] prisma db seed..."
npx prisma db seed

echo "[crm-backend] starting server..."
exec node dist/server.js
