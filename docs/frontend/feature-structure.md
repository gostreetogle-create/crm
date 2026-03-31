# Feature structure (Nx/Angular)

Цель: в фронтенде держать код консистентным и переиспользуемым, без копирования верстки между фичами.

## Как раскладываем по папкам (crm-web)

1. **Фичи Nx** — `crm-web/libs/<name>-feature/src/lib/...`
   - Пример: хаб справочников — `crm-web/libs/dictionaries-hub-feature/` (страница `DictionariesPage`, shell, провайдеры `dictionaries-route.providers.ts`).
   - Page = контейнер с данными и компоновка из **`@srm/ui-kit`**.

2. **Локальные компоненты фичи** — `libs/<feature>-feature/src/lib/components/...`
   - То, что не должно переиспользоваться вне этой фичи (оболочка standalone create, new material page и т.д.).

3. **`crm-web/libs/shared-types`** (`@srm/shared-types`)
   - Общие типы и контракты между фичами. Папку `src/app/shared/model` не наращивать: новые общие типы — в библиотеке.

4. **Общий UI** — **`crm-web/libs/ui-kit`** (`@srm/ui-kit`). Переиспользуемые примитивы без доменной привязки.

5. **Тема** — **`crm-web/libs/theme-core`** (`@srm/theme-core`): токены, пресеты, `ThemeStore`.

6. **Остаточные shared-стили** — `crm-web/src/app/shared/styles/` (мост; цель — сократить в пользу `ui-kit`/токенов).

## Роутинг

- Корневые маршруты: `crm-web/src/app/app.routes.ts` (и отдельно `srm-front` при необходимости).
- Провайдеры хаба справочников: `crm-web/libs/dictionaries-hub-feature/src/lib/dictionaries-route.providers.ts` — подключаются на маршруте `/справочники`, чтобы не тащить store/repository в initial bundle без нужды.
- Feature-level `*.routes.ts` — только если реально подключён в `app.routes.ts` (`loadChildren`). См. [`dictionaries-crud-playbook.md`](./dictionaries-crud-playbook.md).

## SCSS

- В компонентах `ui-kit` стили рядом с компонентом.
- Стили страницы фичи — в `.scss` страницы.
- Таблицы/карточки общего вида — в **`@srm/ui-kit`**, не дублировать на уровне страницы.
- Только theme tokens (`var(--...)`), без локальных палитр в фичах.

## Обязательный рабочий порядок

[`development-workflow.md`](./development-workflow.md).
