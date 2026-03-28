# UI reuse rules

Цель: выжать максимум переиспользования из повторяющейся верстки и визуальных паттернов.

## Куда выносить

1. Если таблица/карточка/бейдж используется минимум в 2 местах или логически общая (например `fields-table`) -> `src/app/shared/ui/...`.
2. Если элемент специфичен только для одной доменной фичи -> `src/app/features/.../components/...`.
3. Если в проекте не хватает компонента для повторяемого паттерна (кнопка, поле, диалог, и т.д.) -> сначала создать его в `src/app/shared/ui/...`, зафиксировать API компонента, и только потом применять в feature-страницах.

## Как проектируем shared-компоненты

- Почти всегда через `@Input()` (никаких зависимостей от конкретных массивов/моделей внутри shared).
- Без SSR (чистый CSR): компонент должен быть визуальным и самодостаточным.
- Верстка + SCSS лежат рядом с компонентом.
- Стили внутри shared-компонентов должны опираться на theme tokens (`var(--...)`), а не на hardcoded цвета.
- Для форм и form-like UI используем Reactive Forms как единый стандарт (без `ngModel` в поддерживаемых компонентах).

## Проверка качества

- После рефакторинга запускать `nx build crm-web`.
- Затем руками проверять визуализацию в дев-сервере.
- Для справочников в `/dictionaries` придерживаться `docs/frontend/dictionaries-crud-playbook.md`.

## Текущий UI-kit (пример)

- `ContentCardComponent` (`src/app/shared/ui/cards/content-card/`)
  - Обёртка “карточка/секция” с заголовком, используется как контейнер для блоков на страницах.
- `DictionaryHubTileComponent` / `DictionaryHubWideTileComponent` (`src/app/shared/ui/cards/dictionary-hub-tile/`, `.../dictionary-hub-wide-tile/`)
  - Плитка хаба справочников: раскрытие + `content-card` + проекция `crud-layout`; wide — на всю ширину `dictionaryGrid` (`grid-column: 1 / -1`).
- `UiStateCardComponent` (`src/app/shared/ui/state-card/`)
  - Компактная плитка состояния (`info` / `success` / `warning` / `danger`) с иконкой Lucide — эталон для Demo и гайдов.
- `PatternVariantStackComponent` / `PatternVariantSectionComponent` (`src/app/shared/ui/pattern-showcase/`)
  - Вертикальный стек и один блок «вариант эталона»: заголовок, вводный блок с классом `.pattern-variant-intro` (глобальные стили в `shared/styles/pattern-variant-doc.scss`), внутри — `dictionaryGrid` + проекция контента.
- Общие классы форм: `formGrid`, `inlineRow`, `formActionsRow`, `formAuxAction` — `src/app/shared/styles/form-stack.scss` (подключать через `@use` в страницах/компонентах).
- `UiModalFormActionsComponent` (`src/app/shared/ui/modal-form-actions/`)
  - Футер модалки с формой: «Закрыть»/«Отмена» + submit, связанный с формой по `id`; хост `display: contents` под разметку `ui-modal` (`.modalActions`).
- `FieldsTableComponent` (`src/app/shared/ui/fields-table/`)
  - Универсальная таблица полей для отображения `{ key, label, type, required, comment }` (тип `FieldRow` в `src/app/shared/model/field-row.ts`).
- `PageShellComponent` (`src/app/shared/ui/page-shell/`)
  - Базовый shell страницы (фон, внешние отступы, контейнер ширины).
- `PageHeaderComponent` (`src/app/shared/ui/page-header/`)
  - Единый заголовок страницы + блок фактов справа.
- `CrudLayoutComponent` (`src/app/shared/ui/crud-layout/`)
  - Таблица/карточки CRUD: колонки, данные, тулбар и действия формы через `ng-template`, флаг `loading` (пустой список при загрузке), row-actions с Lucide-иконками.
  - На хабе `/dictionaries` таблица: **одна** колонка `hubLine` с коротким доменным заголовком + «Действия»; при `showCardLabel` заголовок карточки по центру сверху, под ним ряд `+` / поиск / Excel. Компактная таблица: `table-layout: fixed`, текст с ellipsis; у `TableColumn` опционально `swatchHexKey` — квадрат цвета (HEX) слева от текста.
  - Встроенный toolbar-стандарт Excel: `downloadTemplate` / `importExcel` / `exportExcel` с иконками и единым UX.
  - Видимость Excel-кнопок также управляется правами через `PermissionsService`.
  - `subtitle` и `facts` доступны, но по умолчанию для справочников НЕ используем; включаем только по явному согласованию UX.
- `FiltersBarComponent` (`src/app/shared/ui/filters-bar/`)
  - Единый блок фильтров (поиск + сортировка + фильтр) с Lucide-иконками у полей.
- `UiPaginationComponent` (`src/app/shared/ui/ui-pagination/`)
  - Единая пагинация с кнопками навигации (стрелки на Lucide-иконках).
- `ThemeStudioComponent` (`src/app/shared/ui/theme-studio/`)
  - Вспомогательный internal-инструмент. По умолчанию не используем на рабочих страницах.
- Основной JSON entry point для дизайнеров — `crm-web/src/app/shared/theme/theme-json-entry.ts`.
- `ThemePickerComponent` (`src/app/shared/ui/theme-picker/`)
  - Глобальный selector темы в правом верхнем углу экрана.
- `UiButtonComponent` (`src/app/shared/ui/ui-button/`)
  - Единая кнопка для всех страниц (`primary/soft/danger`, `button/submit/reset`).
- `UiFormFieldComponent` (`src/app/shared/ui/ui-form-field/`)
  - Единая обёртка поля формы (`label`, `required`, `errorText`) для одинакового UX на всех страницах.
- `UiCheckboxFieldComponent` (`src/app/shared/ui/ui-checkbox-field/`)
  - Единый checkbox-паттерн для форм (`formControlName` через ControlValueAccessor).
- `HexRgbFieldComponent` (`src/app/shared/ui/hex-rgb-field/`)
  - Переиспользуемое поле цвета: ручной `HEX`, color-picker и авто-подстановка `RGB`.
- `SectionLabelComponent` (`src/app/shared/ui/section-label/`)
  - Малый "приклеенный" label для угла карточек/секций (`text`, `corner=true` по умолчанию).
- `PermissionsService` + auth types (`src/app/core/auth/`)
  - Единый источник ролей/прав для UI (`UserRole`, `PermissionKey`, `ROLE_PERMISSIONS`, методы `can()`/`hasAny()`).
- `HasPermissionDirective` (`src/app/shared/directives/has-permission.directive.ts`)
  - Структурная директива для шаблонов: `*appHasPermission="'crud.delete'"` или массив прав + режим `appHasPermissionMode="any"`.

## Что запрещено в feature-страницах

- Не использовать “сырые” `<button>` для типовых действий CRUD; использовать `UiButtonComponent`.
- Не дублировать шаблон `label + input/select/textarea + error`; использовать `UiFormFieldComponent`.
- Не вводить локальные цвета/радиусы в feature-`scss`; только theme tokens и shared-ui.
- Не использовать emoji/произвольные SVG для типовых действий CRUD/filters/pagination; использовать `@lucide/angular` и семантические токены темы (`--icon-affirm`, `--accent`, `--warning`, `--danger`, `--text-muted`).
- Не допускать расхождения между Demo и справочниками по базовому каркасу `CrudLayout` (Demo — источник визуального эталона).
- Если временно пришлось нарушить правило — обязательно добавить запись в `docs/frontend/temporary-deviations-log.md`.

