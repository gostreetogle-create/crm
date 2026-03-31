# @srm/auth-session-angular

Angular-слой сессии: `SessionAuthService`, `authBearerInterceptor`.

## Импорт

Только через public API:

```ts
import { SessionAuthService, authBearerInterceptor } from '@srm/auth-session-angular';
```

## Зависимости

- `@srm/auth-session-core` — контракты, JWT, политика hydrate, чтение токена.
- `@srm/authz-runtime` — `PermissionsService`.
- `@srm/dictionaries-state` — `RolesStore` (подгрузка ролей после логина).

Не импортировать из `src/app`.
