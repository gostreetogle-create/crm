# API contracts (frontend side)

## Dictionaries CRUD endpoints

Frontend now works from the unified `/dictionaries` page and uses feature repositories/stores per dictionary.
For backend integration, keep contracts in feature modules (`materials`, `geometries`, `units`, `colors`, `surface-finishes`, `coatings`).

## Switching mock -> http

File:
- `crm-web/src/app/core/api/api-config.ts`

Set:
- `useMockRepositories: false`
- `baseUrl: 'http://localhost:3000'` (or your backend URL)

Operational runbook:
- `docs/frontend/backend-enable-runbook.md`

