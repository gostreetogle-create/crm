# Backend (`@crm/backend`)

Express + TypeScript + Prisma + PostgreSQL.

## Локально

1. **Поднять PostgreSQL** и задать `DATABASE_URL` в `backend/.env` (см. `.env.example`).
   - Через Docker из репозитория:  
     `docker compose -f ../deploy/docker-compose.yml up -d postgres`  
     Имя контейнера по умолчанию: **`crm_postgres`**. Если контейнер уже есть, но остановлен: **`docker start crm_postgres`**.  
     Канон: порт на хосте **5432** (`POSTGRES_PORT` в `deploy/.env`); он **должен совпадать** с URL в `DATABASE_URL`. Таблица портов: `docs/dev-local-ports.md`.
2. Миграции и сиды:  
   `npx prisma migrate dev`  
   `npx prisma db seed` (идемпотентно: канонические роли из **`backend/shared/canonical-roles.seed.json`** через `prisma/seed-roles.ts`, пользователь `admin`/`admin`, опционально `director`/`director` — см. `SEED_DIRECTOR_USER` в `.env.example`; затем единицы измерения и демо-данные справочников при пустых таблицах)

3. **Полный сброс БД (разработка)** — удалить все данные и применить миграции + seed заново:  
   `npm run db:reset`  
   (эквивалент `npx prisma migrate reset --force`). Требуется доступный PostgreSQL и корректный `DATABASE_URL`.

4. **Проверка матрицы прав** (роли в БД ↔ ключи в `authz_matrix`):  
   `npm run authz:check`  
   Отчёт для админа также: `GET /api/authz-matrix/diagnostics` (см. `docs/frontend/authz-matrix-runbook.md`).  
   **`GET /api/authz-matrix`** отдаёт матрицу из БД после той же санитизации, что и `PUT` (неизвестные `roleId`, неверные ключи, согласование `dict.hub.*` с `page.dictionaries`) — см. `src/lib/authz-matrix-sanitize.ts`.

5. Запуск: `npm run dev` → `http://localhost:3000`  
   - `GET /health`, `GET /api/health`  
   - `GET|POST /api/units`, `PUT|DELETE /api/units/:id`

### Если в консоли Prisma: «Can't reach database server»

Сначала запусти Postgres (см. выше). Пока БД недоступна, маршруты с обращением к БД будут отвечать **500** или (в админ-зоне) **503**.

### Вместе с фронтом (локально)

Фронт **без моков**: всё читает/пишет через API. Для полноценной работы:

1. **PostgreSQL** (см. выше).
2. **`backend/`** — `npm run dev` (порт **3000**).
3. **`crm-web/`** — `npm start` / `nx serve` (порт **4200**).

Прокси: `crm-web/proxy.conf.json` перенаправляет `/api` на `127.0.0.1:3000`. Подробности и порядок запуска: `docs/frontend/backend-enable-runbook.md`, правило Cursor `.cursor/rules/local-dev-launch.mdc`.

## Прод (Docker)

См. `../deploy/docker-compose.yml`: при старте контейнера backend выполняется `prisma migrate deploy` и `prisma db seed`, затем `node dist/server.js`. Для backend задано `SEED_DIRECTOR_USER=0`, чтобы не создавать тестового пользователя `director` с известным паролем.
