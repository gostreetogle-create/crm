# Frontend Architecture Canon

## 1. Source of truth

- Route contracts, shared CRUD behavior и публичные redirect-paths задаются в `libs`.
- Приложения (`crm-web`, `srm-front`) только подключают shared контракты и app-specific страницы.

## 2. Mandatory quality gates

- Fail-fast:
  - `check:workspace-prereqs`
  - `check:route-parity`
  - `check:dictionaries-page-size`
- Основной CI:
  - `nx affected -t lint`
  - `nx affected -t test`
  - `nx affected -t build`

## 3. Dictionaries architecture

- Единый пользовательский вход: `/справочники`.
- Legacy redirects поддерживаются, но не считаются отдельными UI-потоками.
- CRUD-поведение (toolbar/rows/actions) унифицируется через shared layout.

## 4. Field contract canon

- Поле считается каноничным только если синхронизировано в:
  - форме,
  - payload builder,
  - таблице,
  - тесте/проверке.
- Поля без typed-контракта считаются техническим долгом.

## 5. Mega-file policy

- Файлы > 3000 строк считаются зоной повышенного риска.
- Для `dictionaries-page.ts` действует временный guard по размеру (6200 строк).
- Любая крупная фича должна выносить новую доменную логику в отдельные модули/helper-файлы.

## 6. Deviation policy

- Временные исключения допускаются только через `temporary-deviations-log.md`.
- Исключение без записи = нарушение канона.

## 7. Canon references

- Field contracts canon: `docs/frontend/field-contracts-canon.md`.
- CRM/SRM parity canon: `docs/frontend/parity-policy-crm-vs-srm.md`.
- Master audit source: `docs/frontend/architecture-audit-master.md`.
