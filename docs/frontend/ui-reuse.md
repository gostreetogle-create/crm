# UI reuse rules

Цель: максимум переиспользования повторяющейся вёрстки и визуальных паттернов без дублирования в фичах.

## Куда выносить (актуально для репозитория)

1. Повторяющийся визуальный примитив (кнопка, поле, модалка, карточка, таблица CRUD, фильтр-бар и т.д.) — в **`crm-web/libs/ui-kit`**, публичный импорт **`@srm/ui-kit`**. Список экспорта: `crm-web/libs/ui-kit/src/index.ts`.
2. Повторяющиеся **типы/контракты** между фичами — в **`@srm/shared-types`** (`crm-web/libs/shared-types`), не в `src/app/shared/model`.
3. Элемент **только одной доменной фичи** — в `crm-web/libs/<feature>-feature/.../components/...` (например справочники: `dictionaries-hub-feature`).
4. Общие **стили-утилиты** (классы сетки форм и т.п.), пока не перенесены в `ui-kit`: `crm-web/src/app/shared/styles/` (например `form-stack.scss`) — подключать через `@use` из страниц/компонентов; цель — со временем сузить до токенов + примитивов `ui-kit`.

## Как проектируем компоненты в `ui-kit`

- По возможности чистые `@Input()` / outputs, без привязки к доменным store.
- Верстка + SCSS рядом с компонентом в `libs/ui-kit/src/lib/...`.
- Стили на **theme tokens** (`var(--...)`), не произвольный hex в компоненте.
- Формы: Reactive Forms как стандарт в поддерживаемых сценариях (см. [`development-workflow.md`](./development-workflow.md)).

## Проверка качества

- `nx build crm-web`.
- Ручной смоук на dev-server для затронутых маршрутов.
- Для хаба справочников — [`dictionaries-crud-playbook.md`](./dictionaries-crud-playbook.md).

## Справочник: что где лежит (импорт → папка в репо)

Все перечисленные ниже компоненты в коде подключаются через **`import { … } from '@srm/ui-kit'`**; путь — под `crm-web/libs/ui-kit/src/lib/`.

| Компонент / сервис | Назначение |
|--------------------|------------|
| `ContentCardComponent`, `DictionaryHubTileComponent`, … | Карточки и плитки хаба (`lib/cards/`) |
| `CrudLayoutComponent` | Таблица/тулбар CRUD (`lib/crud-layout/`) |
| `PageShellComponent` | Оболочка страницы (`lib/page-shell/`) |
| `UiModal`, `UiModalFormActionsComponent` | Модалки и футер формы (`lib/modal/`, `lib/modal-form-actions/`) |
| `UiButtonComponent` | Кнопки (`lib/ui-button/`) |
| `UiFormFieldComponent`, `UiCheckboxFieldComponent`, `HexRgbFieldComponent` | Поля форм |
| `FieldsTableComponent` | Таблица полей `FieldRow` |
| `FiltersBarComponent`, `UiPaginationComponent` | Фильтры и пагинация |
| `AppHeaderComponent`, `ThemePickerComponent` | Хедер и переключатель темы |
| `HubCrudExpandStateService` | Состояние раскрытия плиток хаба (`lib/hub-crud-expandable/`) |
| `PatternVariantStackComponent`, `PatternVariantSectionComponent` | Витрина вариантов на demo (`lib/pattern-showcase/`) |
| `UiStateCardComponent` | Плитка состояния (tone) |

**Тема:** `ThemeStore`, схема токенов, пресеты, JSON entry — `crm-web/libs/theme-core/src/lib/` (пакет `@srm/theme-core`).

**Остаток в `crm-web/src/app/shared/ui/`:** точечные компоненты (например `theme-studio`, `section-label`), не расширять без переноса в `ui-kit`.

**Права в UI:** `PermissionsService` из `@srm/authz-runtime` / `@srm/authz-core` (см. [`rbac-and-admin-settings.md`](./rbac-and-admin-settings.md)); директивы — см. актуальные импорты в приложении.

## Что запрещено в feature-страницах

- «Сырые» `<button>` для типовых действий вместо `UiButtonComponent` (если нет веской причины + запись в [`temporary-deviations-log.md`](./temporary-deviations-log.md)).
- Дублировать `label + input + error` вместо `UiFormFieldComponent`.
- Локальные палитры/радиусы в feature-`scss` вместо токенов и примитивов `ui-kit`.
- Emoji/произвольные SVG для типовых действий вместо `@lucide/angular` и семантических токенов (`--icon-affirm`, `--accent`, `--warning`, `--danger`, `--text-muted`).
- Расхождение эталона Demo и продуктового хаба по базовому каркасу `CrudLayout` без согласованного отклонения.
