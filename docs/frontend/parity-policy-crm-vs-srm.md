# Parity Policy CRM vs SRM

Базовый документ: `docs/frontend/parity-policy.md`.  
Этот файл фиксирует тот же канон под требуемым именованием артефакта.

## Scope (P0)

- `crm-web/src/app/app.routes.ts`
- `crm-web/srm-front/src/app/app.routes.ts`
- Shared route contracts в `libs/dictionaries-hub-feature`
- Contract checks: `check:route-parity`

## Rules

1. Публичные redirect-сегменты задаются только через shared contract.
2. Дублирование route-массивов между приложениями вручную запрещено.
3. Изменение в одном приложении без зеркалирования во втором = PR FAIL.
4. Исключения допускаются только с записью в `temporary-deviations-log.md`.

## CI Enforcement

- `npm run check:route-parity`
- `npm run check:workspace-prereqs`
- `npx nx affected -t lint,test,build --base=origin/main --head=HEAD`

