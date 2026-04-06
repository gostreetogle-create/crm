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
   `npx prisma db seed` (идемпотентно: канонические роли из **`backend/shared/canonical-roles.seed.json`** через `prisma/seed-roles.ts`; на фронте тот же список — **`crm-web`**: `npm run sync:canonical-roles` → `canonical-roles.generated.ts`). Пользователь `admin`/`admin`, опционально `director`/`director` — см. `SEED_DIRECTOR_USER` в `.env.example`; затем единицы измерения и демо-данные справочников при пустых таблицах)

   **Каталог «комплексы → товары → позиции»** (миграция `20260406140000_complexes_products_articles`): таблицы `complexes`, `products`, `articles`. В Prisma: `Complex`, `Product` (каталог), `Article`. Производственное изделие (BOM к деталям) — модель **`ManufacturedProduct`**, таблица **`"Product"`**; не путать с каталожным `products`.  
   Доступ к **`/api/complexes`**, **`/api/catalog-products`**, **`/api/catalog-articles`** требует права **`dict.hub.catalog_suite`** (проверка на бэкенде; ключ в матрице и в `@srm/authz-core`). При чтении матрицы роли с **`dict.hub.trade_goods`** автоматически получают **`dict.hub.catalog_suite`**, если его ещё не было (см. `augmentAuthzMatrixImplicitHubKeys`).

3. **Полный сброс БД (разработка)** — удалить все данные и применить миграции + seed заново:  
   `npm run db:reset`  
   (эквивалент `npx prisma migrate reset --force`). Требуется доступный PostgreSQL и корректный `DATABASE_URL`.  
   Удобно из корня репо: `deploy/scripts/reset-local-dev-database.ps1` (Windows) или `deploy/scripts/reset-local-dev-database.sh` — поднимут `postgres` из compose и вызовут `db:reset` (только если `DATABASE_URL` на localhost).

   **Если команду запускает агент Cursor:** Prisma может потребовать переменную `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` с **точным текстом** твоего сообщения-согласия на сброс (защита от случайного `migrate reset` из AI). В обычном терминале (PowerShell/CMD вне Cursor) у большинства пользователей этого запроса **нет** — достаточно `npm run db:reset`.

4. **Проверка матрицы прав** (роли в БД ↔ ключи в `authz_matrix`):  
   `npm run authz:check`  
   Отчёт для админа также: `GET /api/authz-matrix/diagnostics` (см. `docs/frontend/authz-matrix-runbook.md`).  
   **`GET /api/authz-matrix`** отдаёт матрицу из БД после той же санитизации, что и `PUT` (неизвестные `roleId`, неверные ключи, согласование `dict.hub.*` с `page.dictionaries`) — см. `src/lib/authz-matrix-sanitize.ts`.

5. Запуск: `npm run dev` → `http://localhost:3000`  
   - `GET /health`, `GET /api/health`  
   - `GET|POST /api/units`, `PUT|DELETE /api/units/:id`  
   - Каталог комплексов / товаров / позиций (JWT): `GET|POST /api/complexes`, `PUT|DELETE /api/complexes/:id`; `GET|POST /api/catalog-products` (фильтр `?complexId=`), `PUT|DELETE /api/catalog-products/:id`; `GET|POST /api/catalog-articles` (фильтр `?productId=`), `PUT|DELETE /api/catalog-articles/:id`. Производственные изделия по-прежнему `/api/products`.

### Если в консоли Prisma: «Can't reach database server»

Сначала запусти Postgres (см. выше). Пока БД недоступна, маршруты с обращением к БД будут отвечать **500** или (в админ-зоне) **503**.

### Вместе с фронтом (локально)

Фронт **без моков**: всё читает/пишет через API. Для полноценной работы:

1. **PostgreSQL** (см. выше).
2. **`backend/`** — `npm run dev` (порт **3000**).
3. **`crm-web/`** — `npm start` / `nx serve` (порт **4200**).

Прокси: `crm-web/proxy.conf.json` перенаправляет `/api` и `/media` на `127.0.0.1:3000`. Подробности и порядок запуска: `docs/frontend/backend-enable-runbook.md`, правило Cursor `.cursor/rules/local-dev-launch.mdc`.

### Фото товаров (справочник «Товары»)

Файлы кладутся в каталог из **`TRADE_GOODS_PHOTOS_DIR`** (по умолчанию `backend/uploads/trade-goods-photos`). Имя файла должно совпадать с **артикулом** товара (`code`), например `TG-001.jpg` (поддерживаются `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`). Раздача: **`GET /media/trade-goods/<имя-файла>`**. В API списка и карточки товара поле **`photoUrl`** заполняется, если файл найден.

## Прод (Docker)

См. `../deploy/docker-compose.yml`: при старте контейнера backend выполняется `prisma migrate deploy` и `prisma db seed`, затем `node dist/server.js`. Для backend задано `SEED_DIRECTOR_USER=0`, чтобы не создавать тестового пользователя `director` с известным паролем.

Шпаргалка команд деплоя: `../deploy/README.md`. Логи и `requestId` для разбора ошибок: `../docs/dev-logs-and-diagnostics.md`.
