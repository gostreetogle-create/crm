# Backend: аудит (состояние на 2026-03-29) и дорожная карта

Цель этапа: довести backend до уровня **контракта с фронтом**, **схемы из `docs/backend-map/`**, и **деплоя «как на сервере»** по аналогии с монорепо [crmgenerator_nx](https://github.com/gostreetogle-create/crmgenerator_nx) (Docker, nginx, скрипт деплоя).

---

## 0. Зафиксированные решения (2026-03)

| Тема | Решение |
|------|---------|
| Кто пользуется | **Одна компания**, внутренний инструмент; не SaaS и не «каждый клиент поднимает свою систему». |
| Мультитенант / `organizationId` | **Не нужен в v1**; карточки организации в новом продукте пока нет — не тянем старую бизнес-логику. Поле tenant при необходимости добавим позже миграцией. |
| Роли | **Доступы внутри одной компании** (RBAC); детали хранения и проверки на API — в фазе C. |
| Ссылка на старый репозиторий | Только **техника**: deploy, Docker, nginx. **Бизнес-логику старого сайта не копируем.** |
| Порядок работ | Сначала **локально**: доработать backend, прогнать тесты и ручную проверку с фронтом; затем **сервер** (Ubuntu): свежий clone репо, `deploy/.env`, `deploy/deploy.sh` (или аналог), правки по ошибкам. Дальше цикл **feature → push → deploy**. |
| Домен / HTTPS | Домен на сервере, сертификат предположительно есть; финальная стыковка TLS на Ubuntu — при установке (внешний nginx/Caddy или существующая схема — по факту на сервере). |

---

## 1. Что есть сейчас в `crm`

### 1.1. Код backend (`backend/`)

| Компонент | Статус |
|-----------|--------|
| Стек | Node 20, Express, TypeScript, `tsx` (dev), Zod в зависимостях (почти не используется в роутинге) |
| База данных | **Нет** (нет Prisma/Drizzle/SQL миграций) |
| Эндпоинты | `GET /health`, `GET /api/health`, `GET /material-geometry/model` (+ дубль монтирования роутера под `/api`) |
| Аутентификация | Нет |

Ответ `GET /material-geometry/model` — **устаревший относительно текущего фронта**: в `crm-web` больше нет feature `material-geometry`; актуальный UI — хаб `/dictionaries` с отдельными сущностями (материалы, характеристики, геометрии и т.д.).

### 1.2. Фронт и контракт

| Источник | Статус |
|----------|--------|
| `crm-web/.../api-config.ts` | `useMockRepositories: true`, `baseUrl: ''` — **почти всё на моках** |
| HTTP-репозиторий | Реализован только **`UnitsHttpRepository`**: `GET/POST /units`, `PUT/DELETE /units/:id` |
| Остальные справочники | Только `*MockRepository` (materials, MC, geometries, colors, coatings, surface-finishes, work types, clients, roles, users) |

Канон по единицам измерения: `docs/frontend/api-contracts.md` (поля `id`, `name`, `code`, `notes`, `isActive`).

Устаревшие/смешанные доки: `docs/frontend/backend-integration-strategy.md` и `backend-enable-runbook.md` описывают **`material-geometry`** — их нужно будет переписать под реальные ресурсы `/dictionaries` или отдельные REST-ресурсы.

### 1.3. Карта данных

- Источник аналитики: `docs/backend-map/*.json` + автообзор `OVERVIEW.generated.md` (генератор: `node scripts/generate-backend-map-overview.cjs`).
- Поля в JSON (пример: `material.listPrice`) **не совпадают дословно** с текущими TS-моделями фронта (пример: `MaterialItem.purchasePriceRub`, связи `materialCharacteristicId` / `geometryId`). Перед Prisma-схемой нужна **явная таблица маппинга** (FE ↔ API ↔ БД).

### 1.4. Деплой (`deploy/`)

| Артефакт | Назначение |
|----------|------------|
| `docker-compose.yml` | Сервисы `backend` (порт из env) и `web` (nginx → статика Angular) |
| `deploy.sh` | `git pull`, `docker compose build/up`, проверка `/health` |
| `nginx.conf` | Прокси `location /api/` → `backend:3000/api/`; отдельный костыль `=/material-geometry/model` |

**Единый префикс `/api`:** реализован для единиц (`UnitsHttpRepository` → `/api/units`). Nginx по-прежнему проксирует `location /api/` на backend. В dev Angular — `crm-web/proxy.conf.json`.

### 1.5. Сравнение с crmgenerator_nx

Репозиторий [crmgenerator_nx](https://github.com/gostreetogle-create/crmgenerator_nx): Angular 21 + Nx, backend Express + **Prisma + PostgreSQL**, `deploy/` с Docker. Принципы, которые имеет смысл перенести «как тепло»:

- Одна БД, миграции, Prisma Client.
- Единый документ контракта API для фронта (`FRONTEND_CONTRACT` у них; у нас развить `docs/frontend/api-contracts.md` + OpenAPI по желанию).
- Скрипт деплоя из каталога `deploy/` с `docker compose`, health-check после подъёма.

Имя скрипта: у нас **`deploy/deploy.sh`**, не `.deploy.sh` в корне. Для привычного «одной команды» можно добавить в корень `./deploy.sh`, вызывающий `deploy/deploy.sh` (без дублирования логики).

---

## 2. Объём работ (фазы)

### Фаза A — Контракт и инфраструктура

1. Зафиксировать **REST-контракт** по каждому справочнику (ресурс, поля JSON, коды ошибок, пагинация если нужна).
2. Ввести **PostgreSQL + Prisma** (или выбранный ORM) в `backend/`, миграции, сиды для dev.
3. **Мультитенантность**: для v1 **не вводим** (см. §0); при проектировании Prisma не обязательно тащить `organizationId` из JSON до появления сущности в продукте.
4. Выравнять **префикс API** (`/api/...`) и обновить **nginx + frontend `baseUrl`**.

### Фаза B — Справочники (CRUD)

Реализовать в том порядке, в котором проще строить FK (типично: цвета, отделки, покрытия, единицы, геометрии, виды работ → характеристики материала → материалы → клиенты):

- Эндпоинты в стиле уже ожидаемого `UnitsHttpRepository`: list / create / update / delete (и при необходимости `GET :id`).
- Импорт Excel остаётся на фронте до отдельного решения: либо bulk `POST .../batch`, либо только клиентский parse + множественные create.

### Фаза C — Auth / RBAC

- Фронт уже содержит матрицу прав и «Админ-настройки» на localStorage — для бэка нужны: пользователи, роли, выдача токена или сессии, проверка прав на маршрутах API.
- Уточнить: пароли (hash), политика смены пароля, нужен ли JWT vs cookie.

### Фаза D — Деплой на сервере

- Оставить сценарий: на сервере `git pull`, `./deploy.sh` (или `bash deploy/deploy.sh`), переменные в `deploy/.env` из `.env.example`.
- При необходимости добавить TLS/внешний nginx — вне текущего compose или документировать.

### Фаза E — Документация и чистка

- Обновить `docs/frontend/backend-enable-runbook.md` под реальные эндпоинты.
- Пометить или удалить legacy `material-geometry` из backend/nginx, когда больше не нужен.
- После изменений схемы в `docs/backend-map/**/*.json` — прогон генератора обзора (см. `docs/backend-map/README.md`).

---

## 3. Чеклист вопросов к владельцу продукта / заказчику

Ответы сузят модель и сроки.

1. ~~**Тенантность**~~ — **закрыто**: одна компания, без `organizationId` в v1 (§0).
2. **Идентификаторы**: на бэке строго UUID v4, или допускаются строковые id как сейчас в моках?
3. **Мягкое удаление**: везде `isActive` / запрет физического `DELETE`, или для части справочников — жёсткое удаление?
4. **Материал и цена**: канон в БД — `purchasePriceRub` (как UI) или `listPrice` (как в `entities_from_dictionaries.json`)?
5. **Пароли пользователей**: только bcrypt + сброс админом, или ещё email-поток (вне рамок v1)?
6. **Хостинг API в проде**: API только за тем же nginx (`/api`), или отдельный порт наружу? (Рекомендация: один origin, всё под `/api` в nginx внутри compose.)
7. ~~**crmgenerator_nx**~~ — **закрыто**: ссылка только под **технику** deploy/Docker/nginx (§0).
8. **Объём v1**: все плитки `/dictionaries` + users/roles + settings, или сначала подмножество (какое)?

---

## 4. Следующие шаги

1. **Локально**: утвердить **список ресурсов v1** и префикс `/api`; Prisma schema **без** обязательного `organizationId`; первая БД (PostgreSQL) + миграции; CRUD по приоритету FK; переключение репозиториев с моков на HTTP.
2. **Сервер**: свежий clone → `deploy/.env` → `bash deploy/deploy.sh`; при сбоях — логи `docker compose logs`, правки конфига; TLS — по схеме уже на Ubuntu (домен и сертификат у вас).
3. **Постоянный цикл**: изменения в репо → push → на сервере pull и тот же deploy.

Этот файл — живой план; открытые пункты остаются в §3 (идентификаторы, удаление, цена материала, auth, объём v1).
