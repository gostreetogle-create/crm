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

## Текущий UI-kit (пример)

- `ContentCardComponent` (`src/app/shared/ui/content-card/`)
  - Обёртка “карточка/секция” с заголовком, используется как контейнер для блоков на страницах.
- `FieldsTableComponent` (`src/app/shared/ui/fields-table/`)
  - Универсальная таблица полей для отображения `{ key, label, type, required, comment }` (тип `FieldRow` в `src/app/shared/model/field-row.ts`).
- `PageShellComponent` (`src/app/shared/ui/page-shell/`)
  - Базовый shell страницы (фон, внешние отступы, контейнер ширины).
- `PageHeaderComponent` (`src/app/shared/ui/page-header/`)
  - Единый заголовок страницы + блок фактов справа.
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

## Что запрещено в feature-страницах

- Не использовать “сырые” `<button>` для типовых действий CRUD; использовать `UiButtonComponent`.
- Не дублировать шаблон `label + input/select/textarea + error`; использовать `UiFormFieldComponent`.
- Не вводить локальные цвета/радиусы в feature-`scss`; только theme tokens и shared-ui.
- Если временно пришлось нарушить правило — обязательно добавить запись в `docs/frontend/temporary-deviations-log.md`.

