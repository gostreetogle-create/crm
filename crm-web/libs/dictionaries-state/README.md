# @srm/dictionaries-state

Signal stores (`@ngrx/signals`) для словарных сущностей.

## Зависимости

- `@srm/*-data-access` — репозитории и модели.
- Не тянуть UI-библиотеки.

## Использование

Провайдеры фичи подключают store + `*_REPOSITORY` (см. `dictionaries-route.providers.ts` в приложении).
