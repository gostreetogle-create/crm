# Design system contract

Цель: любой новый экран и новая фича должны использовать единый стиль и только переиспользуемые компоненты + theme tokens.

## Визуальный аудит (пиксель-чеклист)

Полный список проверок по экранам и состояниям: [`visual-consistency-checklist.md`](./visual-consistency-checklist.md).

Почему в продукте всё ещё бывают расхождения с каноном и как согласовывать пробелы в доках: [`ui-consistency-and-legacy.md`](./ui-consistency-and-legacy.md).

## Источник стиля

1. **Значения темы (единственный полный набор):** `crm-web/libs/theme-core/src/lib/theme-schema.ts`, пресеты и **`defaultTheme`** (`light`) — `theme-presets.ts`.
2. **Запись в CSS:** `applyThemeTokensToDocument` (`apply-theme-to-document.ts`) — вызывается из **`crm-web/src/main.ts`** до bootstrap и из **`ThemeStore`** (`theme.store.ts`). Класс `ThemeService` оставлен для совместимости; новый код — через `ThemeStore`.
3. **`crm-web/src/styles.scss`:** только то, чего нет в `ThemeTokens` (формы, layout main/shell, компактная высота кнопок и т.д.) и **fallback** в `var(..., default)` до гидратации JS. Не дублировать сюда токены из пресетов.
4. **Смена темы (пошагово, в т.ч. для ИИ):** [`theme-change-guide.md`](./theme-change-guide.md). Кратко про JSON: [`theme-json-templates.md`](./theme-json-templates.md). Отдельного встроенного JSON-файла в репозитории нет.
5. **Публичный UI-кит:** импорт из **`@srm/ui-kit`**, исходники — `crm-web/libs/ui-kit/src/lib/`. Туда же относятся `ThemePickerComponent` (`libs/ui-kit/src/lib/theme-picker/`), `AppHeaderComponent`, `CrudLayout`, модалки, поля и т.д.
6. Синхронизация и хранение темы:
   - поток `theme$` (через `ThemeService`/`ThemeStore` — см. `theme-core`);
   - выбранная тема в `localStorage` (`crm-web.theme.tokens.v1`) и восстановление при перезагрузке.
7. **Общие SCSS-миксины/классы форм** (например `form-stack`) — пока в `crm-web/src/app/shared/styles/`; это мост к полному переносу в `ui-kit`/`theme-core` (см. `docs/frontend/srm-front-development-workflow.md` при необходимости).
8. **Наследие:** в `crm-web/src/app/shared/ui/` остались единичные вещи (например `theme-studio`, `section-label`). **Новые** переиспользуемые компоненты добавляются в **`crm-web/libs/ui-kit`**, экспортируются из `libs/ui-kit/src/index.ts`, в приложениях импортируются как `@srm/ui-kit`.
9. Текущий базовый визуальный вектор (light): приглушённый контраст, компактная сетка, радиусы из токенов (`radiusCard` / `radiusPill`).
10. Иконки: `@lucide/angular`, базовая геометрия 24px, семантические цвета от токенов темы:
   - `--icon-affirm` (позитивные действия: create/save/confirm),
   - `--accent` (навигация/ссылки/нейтральные действия),
   - `--warning` (внимание/сроки),
   - `--danger` (опасные действия),
   - `--text-muted` (вспомогательные иконки).

## Обязательные правила для новых фич

1. Нельзя хардкодить цвета/радиусы/тени в `features/*` компонентах.
   - Только через токены (`var(--...)`) и компоненты **`@srm/ui-kit`**.
2. Layout-элементы и общие визуальные блоки переиспользуются из **`@srm/ui-kit`** (`crm-web/libs/ui-kit/`).
3. Если появился повторяющийся кусок UI (>=2 использования) — выносить в **`libs/ui-kit`**, экспортировать в публичном API пакета.
4. Любая новая фича должна быть описана в docs:
   - структура фичи,
   - какие компоненты **`@srm/ui-kit`** используются,
   - если добавлены новые токены/компоненты — где и зачем.
5. Именование справочников и UI-подписей:
   - длинные/короткие наименования вести по `docs/frontend/dictionaries-naming-convention.md`,
   - сокращения использовать в стиле, близком к ГОСТ (с точками и без двусмысленности).
6. Поля форм (глобально):
   - светлая граница инпутов/селектов/текстовых полей,
   - compact-высота полей (ближе к высоте кнопок),
   - **Модалки:** только `ui-modal` — контент до `100dvh`, без отдельной «версии со скроллом / без». Если форма выше экрана — одна прокрутка в `.modalContent`.
   - **Таблица в `crud-layout` с `tableBodyMaxHeight`:** одна схема для хаба и demo. Значение задаётся из `HubCrudExpandStateService.expandedTableBodyMaxHeight` (или вручную тем же контрактом). На **viewport ≥ 1024px** внутренний скролл у блока таблицы отключается — таблица растёт по высоте, страница листается; на **меньшей ширине** сохраняется ограничение высоты и вертикальный скролл внутри плитки.
   - Для широких и плотных форм в модалке — `size="lg"` / `size="xl"` и при необходимости `ui-form-grid` (`columns` 2 или 3; на всю ширину — класс `uiFormGrid__full` на прямом потомке).
   - **Плитки хаба `/dictionaries`:** только `DictionaryHubTileComponent` (`app-dictionary-hub-tile`). По умолчанию плитка занимает одну ячейку `dictionaryGrid`. **`[fullWidth]="true"`** — та же разметка и те же правила раскрытия/высоты (`hub-crud-expandable-shell`, `crud-layout`), но хост тянется на всю ширину сетки (`grid-column: 1 / -1`) для составных обзоров и таблиц с многими колонками. Отдельные «wide»-обёртки не вводим.

## Минимальный чек перед merge

- `nx build crm-web` проходит.
- Страница визуально корректна в dev-server.
- В docs обновлены пути и правила (если архитектура/стиль изменены).

## Процесс выполнения задач

Единый обязательный процесс разработки зафиксирован в `docs/frontend/development-workflow.md`.
Все следующие изменения в проекте выполняем по этому стандарту.
Отдельный стандарт поведения UI зафиксирован в `docs/frontend/interaction-system.md`.

Если правило в документах конфликтует, приоритет такой:
1) `development-workflow.md`, 2) `interaction-system.md`, 3) `design-system.md`, 4) feature-доки.

