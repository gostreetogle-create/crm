# SRM Front: правила разработки (v1)

Цель: с первого дня строить `srm-front` как library-first проект, без хаотичных переносов и "локальных костылей".

## 1) Архитектурные решения на старте

- Новый app: `srm-front` (работает параллельно с `crm-web`).
- Базовые библиотеки:
  - `ui-kit` - переиспользуемые UI primitives и CRUD shell.
  - `shared-types` - общие типы и контракты.
  - `platform-core` - кросс-фичевые platform helpers (без UI).
- Публичные alias для импорта:
  - `@srm/ui-kit`
  - `@srm/shared-types`
  - `@srm/platform-core`

## 2) Реактивный стандарт

- Локальное состояние компонентов: `signal`, `computed`, `effect`.
- Состояние фич: `@ngrx/signals` (`signalStore`, `withState`, `withComputed`, `withMethods`).
- Async и IO: `rxMethod` + RxJS (`switchMap`, `concatMap`, `tap`).
- Компоненты не держат бизнес-оркестрацию API; это зона store/use-case слоя.

## 3) Границы зависимостей (обязательные)

- `type:app` -> только на libs типов `ui`, `types`, `core`.
- `type:ui` -> только `ui`, `types`, `core`.
- `type:core` -> только `core`, `types`.
- `type:types` -> только `types`.

Смысл: изменения в одном месте распространяются безопасно и предсказуемо.

## 4) Правило "переносим по кускам"

- За одну итерацию переносить 1-2 модуля, не больше.
- Сначала переносить стабильные shared элементы, потом data/domain.
- Нельзя переносить большие page-orchestrator файлы целиком.
- Каждый перенос: сначала публичный API lib (`index.ts`), потом переключение импортов.

## 5) Шаблон PR для миграции

В каждом PR обязательно:

1. Что вынесли (конкретные пути/символы).
2. Зачем вынесли (переиспользование/упрощение/де-дубликация).
3. Риск изменения поведения.
4. Как проверили (команды + ручной сценарий).

## 6) Роботы (минимум)

- `npx nx lint srm-front`
- `npx nx build srm-front --configuration=development`
- `npx nx affected -t lint,test,build` (если задеты несколько проектов)

## 7) Первая рабочая договоренность

- Любой новый общий тип сначала добавляется в `shared-types`.
- Любой повторяемый helper/factory сначала добавляется в `platform-core`.
- Любой повторяемый UI сначала добавляется в `ui-kit`.
- Из app-слоя прямые deep-import в feature папки запрещены, только через public API libraries.

## 8.1) Итерация B.1 (выполнено): authz-канон в `@srm/authz-core`

- Создана библиотека `libs/authz-core` (`type:core`) с единым источником прав:
  - `authz.types`
  - `dict-hub-permissions`
  - `authz.catalog`
  - `authz.matrix`
- В `crm-web/src/app/core/auth/*` оставлены shim-файлы (реэкспорт на `@srm/authz-core`) для безопасного поэтапного перехода без массовой правки всех потребителей.

## 8.2) Итерация B.2 (выполнено): runtime авторизация в `@srm/authz-runtime`

- Создана библиотека `libs/authz-runtime` (`type:core`) и перенесены runtime-элементы:
  - `PermissionsService`
  - `authGuard`
  - `permissionGuard`
  - `HasPermissionDirective`
- Для декуплинга от app-слоя добавлены порты:
  - `AUTHZ_ROLE_CONTEXT` (чтение роли по `id`)
  - `AUTHZ_SESSION_ACCESS` (проверка `isAuthenticated`)
  - `AUTHZ_SYSTEM_ROLE_IDS` (system role ids)
- В `app.config.ts` добавлены provider-адаптеры на `RolesStore` и `SessionAuthService`.
- В `crm-web/src/app/core/auth/*` и `shared/directives/has-permission.directive.ts` оставлены shim-реэкспорты.

## 8.3) Итерация B.3 (выполнено): session contracts в `@srm/auth-session-core`

- Создана библиотека `libs/auth-session-core` (`type:core`) с контрактами сессии:
  - `AUTH_TOKEN_STORAGE_KEY`, `LEGACY_AUTH_STORAGE_KEY`, `AUTH_TOKEN_COOKIE_MAX_AGE_SEC`
  - `DEV_BOOTSTRAP_USERNAME`, `DEV_BOOTSTRAP_PASSWORD`
  - `AuthUserDto`, `LoginResponse`, `MeResponse`
- Добавлены общие helper'ы:
  - `readAuthTokenFromCookie()`
  - `readAuthTokenFromStorage()`
- `session-auth.service`, `auth-bearer.interceptor`, `roles.store` переведены на общие контракты/helper'ы (убрана дублирующая логика чтения токена).

## 8.4) Итерация B.4 (выполнено): hydrate/JWT/HTTP-утилиты в `@srm/auth-session-core`

- Политика bootstrap `/auth/me`: `AUTH_HYDRATE_ME_TIMEOUT_MS`, `AUTH_HYDRATE_ME_RETRY_DELAYS_MS`.
- JWT (без верификации): `decodeJwtRoleId(token)` для раннего `roleId` до ответа сервера.
- Ошибки HTTP без импорта Angular: `isUnauthorizedHttpError`, `describeAuthHttpError` (duck-typing `status`/`url`).
- `SessionAuthService` использует только эти функции из библиотеки.

## 8.5) Итерация B.5 (выполнено): волна `1..5` по выносу UI/theme/state/utils/settings

- **1) UI:** в `@srm/ui-kit` добавлены `HubCrudExpandStateService` и `LinkedDictionaryPropagationConfirmComponent`; в старых путях `shared/ui/*` оставлены shim-реэкспорты.
- **2) Theme:** создан `@srm/theme-core`, перенесены `ThemeStore`, `ThemeService`, `theme-*` контракты/пресеты/json-entry; в `core/theme` и `shared/theme` оставлены shim-реэкспорты.
- **3) State:** создан `@srm/dictionaries-state`, перенесены `*.store.ts` для всех словарных сущностей; в `features/*/state/*.store.ts` оставлены shim-реэкспорты.
- **4) Utils:** создан `@srm/dictionaries-utils`, перенесены `role-sort`, `format-geometry-params-display`, `material-characteristics-excel-import`; в старых `features/*/utils` оставлены shim-реэкспорты.
- **5) Settings data/domain:** создан `@srm/settings-core`, перенесены `DbBackupsAdminService`, `FIELD_RULES_CATALOG`, `FieldRuleRow`; в `features/settings` оставлены shim-реэкспорты.

## 8.6) Итерация B.6 (выполнено): прямые импорты из `@srm/*` для ключевых потребителей

- Переключены потребители с app-shim путей на прямые импорты библиотек:
  - `@srm/theme-core` (`ThemeStore`, `THEME_PRESETS`, `ThemeTokens`)
  - `@srm/settings-core` (`DbBackupsAdminService`, `FIELD_RULES_CATALOG`, `FieldRuleRow`)
  - `@srm/dictionaries-state` (`RolesStore`)
  - `@srm/ui-kit` (`HubCrudExpandStateService`, `LinkedDictionaryPropagationConfirmComponent`)
- Цель: уменьшить зависимость от временного shim-слоя в `src/app` и подготовить его поэтапное удаление.

## 8) Итерация A (выполнено): CRUD shell в `@srm/ui-kit`

**Канонический код** (один источник правды):

- `crm-web/libs/ui-kit/src/lib/crud-layout/**` — `crud-layout`, меню действий строки.
- `crm-web/libs/ui-kit/src/lib/page-header/**` — заголовок блока CRUD (используется внутри `crud-layout`).
- `crm-web/libs/ui-kit/src/lib/modal/**` — `ui-modal` (подтверждение удаления в `crud-layout`).
- `crm-web/libs/ui-kit/src/lib/ui-button/**` — `app-ui-button`.

**Экспорт из библиотеки:** `crm-web/libs/ui-kit/src/index.ts` (`CrudLayoutComponent`, `TableColumn`, `CrudTableRow`, `FactRow`, `UiModal`, `UiButtonComponent`).

**Совместимость с `crm-web` без массового рефактора импортов:** в приложении оставлены тонкие реэкспорты:

- `crm-web/src/app/shared/ui/crud-layout/public-api.ts`
- `crm-web/src/app/shared/ui/modal/public-api.ts`
- `crm-web/src/app/shared/ui/ui-button/ui-button.component.ts`

Они проксируют на `@srm/ui-kit`. Постепенно можно переводить импорты в фичах напрямую на `@srm/ui-kit` и удалять прокси.

**Демо в новом приложении:** страница `CrudSmokePage` (`crm-web/srm-front/src/app/pages/crud-smoke/`), роут по умолчанию `/`. В `srm-front/project.json` в `styles` подключён общий `src/styles.scss`, чтобы токены и внешний вид совпадали с `crm-web`.

**Nx / линт:** проекты `ui-kit`, `shared-types`, `platform-core` должны отображаться в `npx nx show projects`. Если библиотеки «пропали», выполнить `npx nx reset` (при блокировке `.nx` на Windows — перезапустить IDE/терминал) и проверить снова.

**ESLint в `ui-kit`:** для перенесённых селекторов (`crud-layout`, `ui-modal`, `app-*`) временно ослаблены правила префикса и часть template-правил; цель — со временем выровнять под единый стандарт без накопления предупреждений.

## 9) Итерация B (выполнено): типы в `@srm/shared-types`

- **`FieldRow`:** канон в `libs/shared-types/src/lib/field-row.ts`; потребители импортируют `import type { FieldRow } from '@srm/shared-types'` (например `fields-table`).
- **`DictionaryPropagationMode` / `DictionaryPropagationOptions`:** вынесены из `colors.repository` в `libs/shared-types/src/lib/dictionary-propagation.ts`; репозитории colors/coatings/surface-finishes импортируют из `@srm/shared-types`.
- Прокси-файл `src/app/shared/model/field-row.ts` удалён; новые кросс-фичевые типы — только в библиотеке.

См. также `docs/frontend/feature-structure.md`, п. 3.

## 10) Итерация C (выполнено: colors, materials, units, coatings, surface-finishes, geometries, material-characteristics, production-work-types, clients, organizations, roles, users): `API` + domain data-access

- **`API_CONFIG` / `ApiConfig` / `DEFAULT_API_CONFIG`** перенесены в `libs/platform-core` (`api-config.ts`). В приложении остаётся тонкий реэкспорт: `crm-web/src/app/core/api/api-config.ts` → `@srm/platform-core` (чтобы не трогать все импорты сразу).
- Библиотека **`@srm/colors-data-access`** (`crm-web/libs/colors-data-access`): модель `ColorItem` / `ColorItemInput`, токен `COLORS_REPOSITORY`, `ColorsHttpRepository`, `ColorsMockRepository`.
- Библиотеки **`@srm/materials-data-access`**, **`@srm/units-data-access`**, **`@srm/coatings-data-access`**, **`@srm/surface-finishes-data-access`**, **`@srm/geometries-data-access`**, **`@srm/material-characteristics-data-access`**, **`@srm/production-work-types-data-access`**, **`@srm/clients-data-access`**, **`@srm/organizations-data-access`**, **`@srm/roles-data-access`**, **`@srm/users-data-access`** — тот же шаблон (модель + токен + http/mock).
- Фичи **`features/colors|materials|units|coatings|surface-finishes|geometries|material-characteristics|production-work-types|clients|organizations|roles|users/state`** и DI хаба/авторизации импортируют репозитории и константы из соответствующих `@srm/*-data-access`; папки `features/*/data` и модели в `features/*/model` для этих сущностей удалены.
- Утилиты импорта Excel (material-characteristics) берут типы цвета/покрытий/отделки/характеристик из соответствующих `@srm/*-data-access`.

## 11) Итерация D (фундамент): границы для `type:data-access`

- В `eslint.base.config.mjs`: тег **`type:data-access`** — библиотеки могут зависеть только от `data-access`, `core`, `types`; приложения (`type:app`) могут подключать и `data-access`.
- Следующие справочники выносить тем же шаблоном: `libs/<entity>-data-access` + alias `@srm/<entity>-data-access`, провайдеры в `dictionaries-route.providers.ts` перевести на импорты из lib.

## 12) Done / Remaining (после волны 1..20)

**Done:**
- `build`: `crm-web`, `srm-front`.
- `test`: `crm-web` (alias mapping Jest на `@srm/*` добавлен).
- Удалён shim-слой в `src/app` и потребители переведены на прямые импорты `@srm/*`.
- Созданы и интегрированы `theme-core`, `settings-core`, `dictionaries-state`, `dictionaries-utils`.
- Обновлены теги `dictionaries-state` / `dictionaries-utils` до `type:core`.

**Remaining (отдельная UX/quality-волна):**
- `lint crm-web`: остались template/style-guide ошибки (control-flow, eqeqeq, selector rules и пр.) — это не регресс миграции, а отдельный фронтенд-рефактор.
- Декомпозиция `dictionaries-page` на use-case/facade уровень (крупная задача, требует отдельной итерации).
- Полный parity-переезд `srm-front` на production-маршруты и сценарии (сейчас база и smoke/infra готовы).

## 13) Execution wave: шаги 1..50 (обновление)

- Поднят CI: `.github/workflows/frontend-ci.yml` с gates `lint/test/build` для `srm-front` и контрольной сборкой `crm-web`.
- Закрыты базовые release-gates:
  - `npx nx lint srm-front`
  - `npx nx test srm-front`
  - `npx nx build srm-front --configuration=production`
  - `npx nx build crm-web --configuration=development`
- Граф зависимостей при необходимости: локально `npx nx graph` (HTML-экспорт не коммитится, см. `.gitignore`).
- Актуальный трекинг выполнения пунктов `1..50`: `docs/frontend/srm-front-next-50-steps-execution.md`.

## 14) Волна «до 50» (финализации)

- `@srm/auth-session-angular`: `SessionAuthService` + interceptor; `crm-web` и `srm-front` на общей реализации.
- Крупный перенос UI в `@srm/ui-kit` (form fields, cards, shells, pagination, header, …).
- `srm-front`: полные маршруты и те же lazy-страницы, что и `crm-web`, плюс `SrmGlobalErrorHandler`, `SRM_SHELL_ACTIVE`, 403/404.
- Smoke: `docs/frontend/srm-front-parity-smoke.md`, e2e-задел: `docs/frontend/srm-front-e2e-smoke.md`.

## 15) Feature-libs (страницы вне `src/app`)

Публичные страницы живут в библиотеках с тегом **`type:feature`**:

- `@srm/login-feature` — `LoginPage`
- `@srm/dictionaries-hub-feature` — `DictionariesPage`, `DICTIONARIES_ROUTE_PROVIDERS`
- `@srm/settings-feature` — `AdminSettingsPage`, `UserPreferencesPage`
- `@srm/ui-demo-feature` — `UiDemoPage`

Роуты `crm-web` и `srm-front` подключают их только через `@srm/...`. Линт `enforce-module-boundaries` для `srm-front` снова включён.

Заметка: часть SCSS фич по-прежнему тянет шареные миксины из `src/app/shared/styles/` через относительный `@use` (временный мост); следующий шаг — вынести эти partials в `ui-kit` или `theme-core`.
