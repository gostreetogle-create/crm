# Роли и права: архитектура и чеклист

## Источники истины

| Слой | Что хранит | Канон |
|------|------------|--------|
| **БД** `User.roleId` → `Role` | Кто пользователь, код роли | Да |
| **БД** `AppSetting` `authz_matrix` | Переопределения матрицы по `roleId` | Да |
| **Код** `DEFAULT_ROLE_PERMISSIONS_BY_CODE` | Дефолты, если нет строки в матрице для роли | Да |
| **JWT + `/auth/me`** | Текущий `roleId` сессии | Да |
| **localStorage** `crm.authz.matrixOverride` | Кэш матрицы для UI | Нет — зеркало сервера после синхронизации |

После входа вызывается `GET /api/authz-matrix`. Если на сервере **нет** записи (`matrix: null`), локальный кэш матрицы **сбрасывается** (не остаётся старьё после сброса БД).

**Ответ `GET` санитизируется так же, как тело `PUT`:** неизвестные `roleId`, неверные ключи и «висячие» `dict.hub.*` без `page.dictionaries` отбрасываются (`backend/src/lib/authz-matrix-sanitize.ts`). Клиент всегда получает согласованный JSON.

При **выходе** кэш матрицы в браузере очищается; при следующем входе снова подтягивается сервер.

## Поведение матрицы

- Пока для `roleId` **нет** строки в сохранённой матрице — действуют **дефолты по коду** роли.
- Спец-ключ production-контура: `production.force_status` (принудительная смена статуса заказа).
- **Дефолты по коду:** в `DEFAULT_ROLE_PERMISSIONS_BY_CODE` (`crm-web/libs/authz-core/src/lib/authz.matrix.ts`) для **`editor`**, **`director`**, **`accountant`** задан типовой рабочий набор **`DEFAULT_PERMISSIONS_BUSINESS_WORKSPACE`** — все ключи из канона, **кроме** `page.admin.settings` (админ-раздел только у суперадмина). Для **`viewer`** — по-прежнему только `page.dictionaries` и плитки хаба (`dict.hub.*`). Кастомный код роли без строки в матрице — **`[]`**.
- После сохранения набора галочек для роли — **только этот список** (полная замена дефолта для этой роли).
- Строка в матрице с **пустым массивом** `[]` для `roleId` — явное «нет прав» для этой роли (отличается от отсутствия строки, когда снова действуют дефолты по коду). Кнопка «Сбросить галочки» в UI записывает именно `[]`.
- **`page.dictionaries` и `dict.hub.*`:** без ключа `page.dictionaries` ключи `dict.hub.*` **не действуют** и при снятии раздела **снимаются** из матрицы для роли (в UI и в сохранённом JSON). В админ-матрице чекбоксы `dict.hub.*` **заблокированы**, пока у роли не отмечен `page.dictionaries`.
- `PUT /api/authz-matrix` **отбрасывает** неизвестные `roleId` и неверные ключи (устойчивость к старому `localStorage`).

## Синхронизация на клиенте (порядок и гонки)

1. После успешного **`/auth/me`** (и при логине, и при hydrate) сначала **`RolesStore.ensureRolesLoaded()`** (один запрос к `/api/roles`, дедупликация параллельных вызовов), затем **`PermissionsService.syncMatrixFromServerSafe()`** — чтобы prune матрицы и колонки знали актуальные `roleId`.
2. **`syncMatrixFromServerSafe()`** не вызывает `GET`, если в этот момент ожидается debounced **`PUT`** матрицы с клиента (`hasPendingMatrixPersist()`), чтобы не перезатереть несохранённые правки админа.
3. Дополнительно: при **`visibilitychange`** (вкладка снова видна) — безопасный синк; для пользователей **без** `page.admin.settings` — периодический опрос (~120 с). Ошибки чтения матрицы попадают в сигнал **`matrixSyncError`** (полоса в шапке, можно скрыть).

## Чеклист разработчика

1. Меняете канонические роли — правите **один** файл **`backend/shared/canonical-roles.seed.json`**, затем из **`crm-web/`** выполните **`npm run sync:canonical-roles`** и закоммитьте обновлённый **`libs/roles-data-access/src/lib/canonical-roles.generated.ts`** (Prisma seed читает JSON напрямую; фронт и Jest — сгенерированный TS). CI проверяет совпадение (`check:canonical-roles-sync`).
2. Новый ключ права — добавьте в `authz.catalog` / `PermissionKey`, в `backend/src/lib/authz-permission-keys.ts`, в маршруты при необходимости. Для production force-flow обязателен ключ `production.force_status`.
3. После `db:reset` при странностях в правах — перелогиниться (кэш матрицы сбросится с сервером).
4. Прод: в Docker для backend задано `SEED_DIRECTOR_USER=0` (нет тестового `director`/`director`).

Отдельное правило backend-вычисления прав: `admin` (role code) и `isSystem` роль всегда получают полный набор ключей.

## Связанные файлы

- `backend/shared/canonical-roles.seed.json` — канон ролей (id, code, sortOrder, …).
- `backend/prisma/seed-roles.ts` — загрузка JSON для сида.
- `crm-web/scripts/sync-canonical-roles.cjs` — генерация фронта из JSON.
- `crm-web/libs/roles-data-access/src/lib/canonical-roles.generated.ts` — сгенерировано, не править вручную.
- `crm-web/libs/roles-data-access/src/lib/roles.seed.ts` — `ROLES_SEED` и `ROLE_ID_*` из generated.
- `crm-web/libs/dictionaries-state/src/lib/roles.store.ts` — список ролей, **`ensureRolesLoaded()`**.
- `crm-web/libs/auth-session-angular/src/lib/session-auth.service.ts` — hydrate / login, порядок загрузки ролей и матрицы, visibility / интервал.
- `crm-web/libs/authz-runtime/src/lib/permissions.service.ts` — матрица, сессия, кэш, **`syncMatrixFromServer` / `syncMatrixFromServerSafe`**, **`matrixSyncError`**.
- `crm-web/libs/authz-core/src/lib/authz.matrix.ts` — дефолты по коду роли, **`DEFAULT_PERMISSIONS_BUSINESS_WORKSPACE`**.
- `backend/src/lib/authz-matrix-sanitize.ts` — общая санитизация для GET и PUT.
- `backend/src/routes/authz-matrix.routes.ts` — GET/PUT, вызов санитизации.
- `crm-web/libs/ui-kit/src/lib/app-header/*` — опциональное предупреждение при ошибке синка матрицы.
- `docs/frontend/authz-matrix-runbook.md` — операции и диагностика.
