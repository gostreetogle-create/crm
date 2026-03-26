# Backend integration strategy (when backend is not ready)

Сейчас backend отсутствует, поэтому используем правильную промежуточную архитектуру:

## Contract-first + repository adapter

1. Контракт модели:
   - `crm-web/src/app/features/material-geometry/model/material-geometry-model.ts`
2. Интерфейс источника данных:
   - `crm-web/src/app/features/material-geometry/data/material-geometry.repository.ts`
3. Текущая реализация (mock):
   - `crm-web/src/app/features/material-geometry/data/material-geometry.mock-repository.ts`
4. Реальная реализация (HTTP):
   - `crm-web/src/app/features/material-geometry/data/material-geometry.http-repository.ts`
5. API-конфиг:
   - `crm-web/src/app/core/api/api-config.ts`
6. Подключение в DI:
   - `crm-web/src/app/app.config.ts` через factory и `API_CONFIG.useMockRepositories`

## Почему это правильно

- UI уже не привязан к hardcoded массивам внутри page.
- Когда backend появится, нужно только добавить `http`-репозиторий и заменить provider.
- Страница и shared UI при этом не переписываются.

## Как перейти на реальный API потом

1. В `crm-web/src/app/core/api/api-config.ts` установить:
   - `useMockRepositories: false`
   - `baseUrl: '<url backend>'` (или оставить пустым при proxy)
2. Убедиться, что backend реализует endpoint `GET /material-geometry/model`.
3. Сохранить shape ответа совместимым с `MaterialGeometryModel`.

Подробный пошаговый сценарий и откат:
- `docs/frontend/backend-enable-runbook.md`

