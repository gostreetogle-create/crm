# SRM Front: library-first стартовый план

Цель: запустить новое приложение `srm-front` в текущем Nx workspace и переносить из `crm-web` только проверенные куски в библиотеки.

## 1) Принципы (не нарушать)

- Новый app запускается параллельно, старый `crm-web` остается рабочим до финального переключения.
- Никакого массового rewrite: перенос только маленькими итерациями.
- Общие паттерны живут в libs, feature-страницы остаются в app до стабилизации.
- Реактивность по умолчанию: Signals + `@ngrx/signals` store; RxJS только для async/IO.
- Любой PR проходит "роботов": lint, test, build.

## 2) Целевой стек реактивности

Базовый подход:

- Локальное UI-состояние: `signal`, `computed`, `effect`.
- Feature-store: `signalStore` + `withState/withComputed/withMethods`.
- Async-пайплайны: `rxMethod` + RxJS операторы (`switchMap`, `concatMap`, `tap`).
- Data-access через `InjectionToken` + `HttpRepository`/`MockRepository`.

Что это дает:

- предсказуемые update-цепочки;
- минимальные side effects в компонентах;
- легкое переключение mock/http без переписывания UI.

## 3) Карта библиотек (v1)

Рекомендуемый старт:

1. `libs/ui-kit`
   - таблицы, карточки, модалки, кнопки, form primitives.
   - кандидаты из `crm-web/src/app/shared/ui/*`.
   - **Инкремент уже сделан:** вынесены также `HubCrudExpandStateService` и `LinkedDictionaryPropagationConfirmComponent`.

2. `libs/theme`
   - theme store, токены, shared theme helpers.
   - кандидаты из `crm-web/src/app/core/theme/*` и `crm-web/src/app/shared/theme/*`.
   - **Инкремент уже сделан:** `libs/theme-core` (`ThemeStore`, `ThemeService`, `theme-*` контракты).

3. `libs/authz`
   - permissions service, guard utils, permission directives.
   - кандидаты из `crm-web/src/app/core/auth/*`, `crm-web/src/app/shared/directives/*`.
   - **Инкремент уже сделан:** `libs/authz-core` с каноном permission keys/матрицы (`authz.types`, `authz.catalog`, `authz.matrix`, `dict-hub-permissions`).
   - **Инкремент уже сделан:** `libs/authz-runtime` с runtime-слоем (`PermissionsService`, guards, `HasPermissionDirective`) через адаптерные токены к app.

4. `libs/auth-session-core`
   - контракты и helper'ы хранения auth-token/session, hydrate политика, JWT/decode roleId, классификация HTTP-ошибок.
   - **Инкремент уже сделан:** вынесены session DTO/константы, reader токена, timeout/retry для `/auth/me`, `decodeJwtRoleId`, утилиты 401/403.

5. `libs/shared-types`
   - кросс-доменные типы и контракты.
   - канон: `crm-web/libs/shared-types`; повторяемые domain-типы дублировать между фичами не стоит — выносить сюда.

6. `libs/*-data-access` (по одному домену, тег `type:data-access`)
   - репозитории, токены, mock/http; без UI.
   - **Сделано:** `colors-data-access`, `materials-data-access`, `units-data-access`, `coatings-data-access`, `surface-finishes-data-access`, `geometries-data-access`, `material-characteristics-data-access`, `production-work-types-data-access`, `clients-data-access`, `organizations-data-access`, `roles-data-access`, `users-data-access` (`@srm/...`).

7. `libs/dictionaries-domain` (опционально этап 2)
   - signal stores и use-cases по справочникам.
   - кандидаты из `crm-web/src/app/features/*/state/*`.
   - **Инкремент уже сделан:** `libs/dictionaries-state` (signal stores справочников) и `libs/dictionaries-utils` (чистые domain utils).

8. `libs/settings-core`
   - settings data/domain contracts (backup admin + field rules catalog/model).
   - **Инкремент уже сделан:** `DbBackupsAdminService`, `FIELD_RULES_CATALOG`, `FieldRuleRow`.

## 4) Что НЕ переносим на старте

- `features/*/pages/*` и крупную orchestration-логику страниц.
- Очень нестабильные участки, где часто меняется UX.
- Все сразу из `dictionaries-page` (разбивать на мелкие выносы).

## 5) Порядок миграции (итерации)

Итерация A (самая безопасная):

- завести `srm-front` app;
- создать `libs/ui-kit` и перенести 1-2 стабильных shared UI компонента;
- подключить их в `srm-front`.

Итерация B:

- создать `libs/shared-types`;
- вынести повторяемые типы/контракты;
- вычистить импорты внутри app на публичные API libs.

Итерация C:

- создать `libs/dictionaries-data-access`;
- вынести один домен (например colors): token + http/mock repos + adapter;
- проверить подключение к signal store без изменения UX.

Итерация D:

- вынос остальных доменов по одному;
- при необходимости выделить `libs/dictionaries-domain`.

## 6) Границы зависимостей

- `ui-kit` не знает про feature/domain/data-access.
- `shared-types` не зависит от ui.
- `data-access` не импортирует ui.
- app импортирует libs только через публичные `index.ts`.
- запрет циклических зависимостей между libs.

## 7) Роботы (Definition of Done на каждую итерацию)

Минимум:

- `npx nx lint srm-front`
- `npx nx build srm-front --configuration=development`
- `npx nx test srm-front` (если тест-раннер включен)

Для смешанных изменений:

- `npx nx affected -t lint,test,build`

Качественные критерии:

- поведение UI не изменилось;
- imports идут через public API libs;
- нет циклов зависимостей;
- PR содержит "что вынесли / зачем / риск / как проверяли".

## 8) Риски и как избежать

- Риск "переписать все сразу" -> ограничение 1-2 модуля за итерацию.
- Риск распухшего orchestration -> выносить в libs только стабилизированные use-cases.
- Риск разъезда docs и кода -> обновлять релевантные docs в том же PR.
- Риск нестабильного backend -> на ранних итерациях разрешен mock-first режим.

## 9) Первый практический шаг (сегодня)

1. Зафиксировать имя нового app: `srm-front`.
2. Создать app и базовые libs (`ui-kit`, `shared-types`).
3. Перенести первый маленький блок из `shared/ui` (без затрагивания бизнес-логики).
4. Прогнать роботов и открыть первый миграционный PR.
