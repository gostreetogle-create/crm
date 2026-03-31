# Feature Structure (Nx/Angular)

Цель: сохранять предсказуемую архитектуру, где route-контракты, CRUD-паттерны и shared-UI не расходятся между `crm-web` и `srm-front`.

## 1. Слои и ответственность

- `libs/*-feature` — orchestration слой: маршруты, контейнеры страниц, композиция shared-компонентов.
- `libs/*-data-access` — репозитории и API-контракты.
- `libs/*-state` — stores/signals, производные селекторы и UI-ready данные.
- `libs/ui-kit` — только переиспользуемые UI-шаблоны и primitives.
- `src/app` и `srm-front/src/app` — только app-shell/route wiring и app-specific страницы (`404`, `forbidden`).

## 2. Правила роутинга

- Канонический путь словарного хаба: `/справочники`.
- Legacy redirects (латиница) задаются одним shared контрактом, не копипастой в каждом app.
- Child routes под `/справочники` строятся через фабрики из `dictionaries-hub-feature`, чтобы path/data не дрейфовали.
- Любой новый публичный path должен быть одновременно отражен в:
  - shared route-contract (lib),
  - `crm-web` app routes,
  - `srm-front` app routes,
  - контрактных тестах маршрутов.

## 3. Формы и таблицы

- Общий CRUD-каркас (`таблица`, `toolbar`, `действия`) меняется только в shared-слое.
- Доменный слой фичи хранит только:
  - field contracts,
  - payload mapping,
  - доменную валидацию.
- Вынесение доменных helper-функций обязательно, если файл страницы растет и начинает смешивать:
  - route orchestration,
  - form mapping,
  - table rendering,
  - side effects.

## 4. Анти-риски структуры

- Не создавать неподключенные `*.routes.ts` и "теневые" CRUD-страницы.
- Не дублировать одинаковые route segments в двух app-файлах вручную.
- Не хранить доменные field contracts в шаблонах или inline-объектах без typed helpers.

## 5. Проверяемость (минимум)

- Contract tests на маршруты (child segments + public redirects).
- CI fail-fast на целостность workspace перед запуском Nx.
- Guard на размер mega-file для `dictionaries-page.ts` до полного распила.
