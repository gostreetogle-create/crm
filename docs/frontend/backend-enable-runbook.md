# Runbook: включение реального backend

Как переключить фронт с моков на HTTP там, где уже есть реализация.

## Переключатель

- Файл: `crm-web/src/app/core/api/api-config.ts`
- Поля: `useMockRepositories`, `baseUrl`

## Локальная разработка (рекомендуется)

1. Поднять PostgreSQL и backend (см. `backend/README.md`).
2. В `api-config.ts`:
   - `useMockRepositories: false`
   - `baseUrl: ''` — запросы на `/api/*` идут через **прокси** `crm-web/proxy.conf.json` на `http://127.0.0.1:3000`.

## Проверка единиц измерения (первый реальный ресурс)

1. Backend: `GET http://localhost:3000/api/units` возвращает массив объектов `UnitItem` (`id`, `name`, `code?`, `notes?`, `isActive`).
2. Создание/редактирование плитки «Единицы измерения» на `/dictionaries` работает без ошибок в консоли.

## Прод (один домен, nginx из `deploy/`)

- Статика и API с одного origin: `baseUrl: ''`, backend за прокси `location /api/`.
- Если по каким-то причинам API на **другом origin**, задать `baseUrl: 'https://api.example.com'` (или порт backend) и проверить CORS.

## Откат

- `useMockRepositories: true`, `baseUrl: ''` — снова моки (в т.ч. `UnitsMockRepository`).

## Несовместимый ответ API

1. Не ломать UI ради бэка.
2. Маппинг править в соответствующем `*.http-repository.ts`.
3. Зафиксировать контракт в `docs/frontend/api-contracts.md`.
