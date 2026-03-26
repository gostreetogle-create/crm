# Runbook: включение реального backend

Этот документ написан как рабочая инструкция для агента: как безопасно переключить фронт с mock на реальный backend.

## Где переключатель

- Файл: `crm-web/src/app/core/api/api-config.ts`
- Поля:
  - `useMockRepositories`
  - `baseUrl`

## Пошагово (боевой порядок)

1. Подготовка backend
   - Проверить, что endpoint `GET /material-geometry/model` доступен.
   - Проверить, что формат ответа совместим с `MaterialGeometryModel`:
     - `version: string`
     - `materialFields: FieldRow[]`
     - `geometryFields: FieldRow[]`

2. Переключение фронта
   - В `api-config.ts` поставить:
     - `useMockRepositories: false`
     - `baseUrl: 'http://<host>:<port>'` (если backend на другом origin)

3. Прогон проверок
   - `npx nx build crm-web`
   - Запустить dev-server и открыть страницу `material-geometry`
   - Убедиться, что:
     - таблицы заполняются,
     - нет ошибок в консоли браузера,
     - ThemePicker работает,
     - тема из JSON entry point (`crm-web/src/app/shared/theme/theme-json-entry.ts`) корректно подхватывается при старте (когда нет пользовательской темы в `localStorage`).

4. Если backend и frontend на разных origin
   - Проверить CORS на backend.
   - В случае 401/403 — настроить auth-заголовки (следующий этап, пока не включён).

## Быстрый откат (если backend не готов)

- В `api-config.ts` вернуть:
  - `useMockRepositories: true`
  - `baseUrl: ''`

После отката UI снова питается из `MaterialGeometryMockRepository`.

## Что делать при несовместимом ответе backend

1. Не менять UI-слой.
2. Править только `material-geometry.http-repository.ts`:
   - адаптировать backend-shape -> `MaterialGeometryModel`.
3. Зафиксировать маппинг в `docs/frontend/api-contracts.md`.

