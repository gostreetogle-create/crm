# API contracts (frontend side)

## Dictionaries CRUD endpoints

Frontend now works from the unified `/dictionaries` page and uses feature repositories/stores per dictionary.
For backend integration, keep contracts in feature modules (`materials`, `geometries`, `units`, `colors`, `surface-finishes`, `coatings`).

## FE/BE naming convention (`units`)

Чтобы не было расхождений терминов между UI и API:

- UI-обозначение units:
  - карточка (длинное): `Единицы измерения`,
  - поля/колонки (сокращение): `Ед. изм.`.
- API-ресурс: **`/api/units`** (префикс `/api` общий для backend за nginx и для dev-proxy во фронте).
- Поля API (канон): `id`, `name`, `code`, `notes`, `isActive`.
- В backend и интеграционных сообщениях использовать термин `units` / `единицы измерения`.
- Сокращение `Ед. изм.` использовать только в UI-текстах, не в JSON-ключах и не в именах endpoint.

Mapping:

- `Ед. изм.` (UI, поле/колонка) -> `name` (API field)
- `Код` (UI) -> `code` (API field)
- `Комментарий` (UI) -> `notes` (API field)
- `Активна` (UI) -> `isActive` (API field)

Общий источник нейминга для справочников (длинные/короткие формы, ГОСТ-style сокращения):
- `docs/frontend/dictionaries-naming-convention.md`

## Switching mock -> http

File:
- `crm-web/src/app/core/api/api-config.ts`

Set:
- `useMockRepositories: false`
- `baseUrl: 'http://localhost:3000'` (or your backend URL)

Operational runbook:
- `docs/frontend/backend-enable-runbook.md`

## Локальная связка crm-web ↔ backend

- Backend: `backend/README.md` (Postgres, миграции, `npm run dev`).
- Angular dev-server: прокси `proxy.conf.json` в проекте `crm-web` — запросы на `/api/*` уходят на backend.
- В `api-config.ts`: при работе с реальным API выставить `useMockRepositories: false`; `baseUrl` оставить `''`, чтобы использовать тот же origin и прокси.

## Production / Warehouse / Supply contracts (actual)

### Production

- Жизненный цикл заказа: `PENDING -> IN_PROGRESS -> DONE -> SHIPPED`.
- Изменение статуса идет через production API и валидируется сервером по state machine.
- Принудительный переход (`force`) допустим только с правом `production.force_status`.
- Отгрузка (`DONE -> SHIPPED`) запускает серверную транзакцию: смена статуса + автоматическое складское списание.

### Warehouse

- Складские движения: `INCOMING`, `OUTGOING`, `ADJUSTMENT`.
- Сводный endpoint: `GET /api/warehouse/summary`.
- При успешной отгрузке заказа формируются автоматические `OUTGOING` движения.
- Текущая реализация `ADJUSTMENT`: без отдельной отрицательной ветки (расширение возможно в `stock-movement.service.ts`).

### Supply

- `SupplyRequest` автосоздается после оплаты КП.
- Приемка факта ("Поступило") создает `INCOMING` через `applyIncoming`.
- В коде статусы заявки: `OPEN`, `PARTIAL`, `RECEIVED` (есть `CANCELLED` в enum).
- Для бизнес-текстов допускается маппинг: `PENDING` -> `OPEN`, `PARTIALLY_RECEIVED` -> `PARTIAL`.

