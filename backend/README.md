# Backend (`@crm/backend`)

Express + TypeScript + Prisma + PostgreSQL.

## Локально

1. Поднять PostgreSQL (например `docker compose -f ../deploy/docker-compose.yml up -d postgres`) и задать `DATABASE_URL` в `backend/.env` (см. `.env.example`).
2. Миграции и сиды:  
   `npx prisma migrate dev`  
   `npx prisma db seed` (идемпотентно: три единицы, если таблица пустая)
3. Запуск: `npm run dev` → `http://localhost:3000`  
   - `GET /health`  
   - `GET|POST /api/units`, `PUT|DELETE /api/units/:id`

Фронт в dev (`nx serve crm-web`) проксирует `/api` на `127.0.0.1:3000` через `crm-web/proxy.conf.json`.

## Прод (Docker)

См. `../deploy/docker-compose.yml`: при старте контейнера backend выполняется `prisma migrate deploy` и `prisma db seed`, затем `node dist/server.js`.
