# Runbook: backend и фронт (без моков)

Фронт **всегда** ходит в API по HTTP (`*HttpRepository` в DI); in-memory репозитории и флаг `useMockRepositories` **удалены**. Данные в UI — из **PostgreSQL** через backend.

Глобальный аудит **скорости сборки, Docker и размера бандла** (без новых технологий): `docs/frontend/performance-and-build-checklist.md` — в каноне `development-workflow.md` этот чеклист идёт **первым** в запланированный день проверки.

## Конфиг API

- Файл: `crm-web/libs/platform-core/src/lib/api-config.ts`
- Поле: `baseUrl` (по умолчанию `''` — тот же origin; в dev запросы `/api/*` уходят на backend через прокси).

## Локальная разработка: три уровня

Полный стек в dev:

1. **PostgreSQL** — доступен по `DATABASE_URL` в `backend/.env` (см. `backend/.env.example`).
2. **Backend** (`backend/`): `npm run dev` → `http://localhost:3000`
3. **Фронт** (`crm-web/`): `npm start` / `nx serve` → `http://localhost:4200`  
   Прокси: `crm-web/proxy.conf.json` перенаправляет `/api` на `127.0.0.1:3000`.

Фразы вроде «запусти сайт» / «подними dev» в этом репозитории означают **Postgres + backend + фронт** (если не сказано иначе). Подробно для ассистента: `.cursor/rules/local-dev-launch.mdc`.

**Канон портов** (Postgres 5432, API 3000, nginx 8080, `nx serve` 4200): `docs/dev-local-ports.md`.

### PostgreSQL в Docker

`docker-compose.yml` в корне репозитория поднимает Postgres; контейнер **`crm_postgres`**, на хосте по умолчанию **5432** (`POSTGRES_PORT` в `deploy/.env`). Команды из корня репозитория:

```bash
docker compose up -d postgres
```

Если контейнер уже создан, но остановлен:

```bash
docker start crm_postgres
```

Убедись, что `DATABASE_URL` в `backend/.env` указывает на **тот же хост и порт**, что проброшены из Docker (канон: `localhost:5432`).

### Частый кейс Prisma: `prisma://` / `prisma+postgres://`

Если видите ошибку вида:

- `the URL must start with the protocol prisma:// or prisma+postgres://`

значит backend запущен с Prisma Client в Data Proxy/Accelerate режиме, а локально используется обычный `DATABASE_URL=postgresql://...`.

Что сделать:

1. Остановить backend (`npm run dev`).
2. В `backend/.env` оставить обычный URL `postgresql://...`.
3. Выполнить в `backend/`: `npx prisma generate` (без `--no-engine`).
4. Перезапустить backend.

Полный сброс контейнеров и томов Docker для этого compose: см. раздел в `docs/dev-local-ports.md`.

### Проверка

- `GET http://localhost:3000/api/health` → `{ "ok": true }`
- После входа: справочники и CRUD без сетевых ошибок в консоли.

### Если API отдаёт 500 или 503

- **500** на `/api/auth/me`, `/api/roles` и др.: чаще всего **Prisma не может подключиться к БД** (Postgres не запущен или неверный `DATABASE_URL`). Проверь контейнер/службу Postgres и лог `npm run dev` в `backend/` — там будет сообщение вида `Can't reach database server at ...`.
- **503** на админ-эндпоинтах (например бэкапы): при старых JWT без полей роли в токене проверка админа может ходить в БД; при недоступной БД — **503** с `db_unavailable`. После входа заново выдаётся JWT с полями роли; главное — **поднять Postgres**.

## Прод (один домен, nginx из `deploy/`)

- Статика и API с одного origin: `baseUrl: ''`, backend за прокси `location /api/`.
- Если API на **другом origin**: задать `baseUrl: 'https://api.example.com'` и проверить CORS в `backend`.

### Если `deploy.sh` ругается на отсутствие `prebuilt-web/index.html`

- Канон: статика собирается **не на сервере**, а локально/в CI, затем выкладывается в **`deploy/prebuilt-web/`** на VPS (см. `deploy/README.md`).
- Сборка: `cd crm-web && node scripts/sync-canonical-roles.cjs && npx nx run crm-web:build:production`, затем содержимое `dist/crm-web/browser/` → `prebuilt-web/`.

### Если собираете образ web внутри Docker (`Dockerfile.web.in-docker-build`)

- На **малых VPS** возможен **OOM** (долго «Building…», `exit 1` без текста). Тогда: **swap** 2–4 ГБ, build-args **`NODE_BUILD_HEAP_MB`** / **`NG_BUILD_MAX_WORKERS=1`** — см. комментарии в `Dockerfile.web.in-docker-build`.

## Несовместимый ответ API

1. Не ломать UI ради бэка без необходимости.
2. Маппинг править в соответствующем `*.http-repository.ts`.
3. Зафиксировать контракт в `docs/frontend/api-contracts.md`.
