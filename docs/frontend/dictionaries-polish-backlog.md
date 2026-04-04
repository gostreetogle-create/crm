# Справочники: бэклог до полировки (50 пунктов)

Статусы: **done** — сделано в коде/docs; **planned** — в очереди; **partial** — начато или только документировано / ручной долг.

| # | Пункт | Статус |
|---|--------|--------|
| 1 | Разнести монолит `dictionaries-page.ts` на feature-модули по справочнику | **partial** (`dictionaries-hub/` + `dictionaries-page-table-columns.ts` + `dictionaries-page-form-utils.ts` + `dictionaries-page-payload-builders.ts` + лимит строк CI) |
| 2 | Вынести полноэкранные блоки в отдельные компоненты-страницы | **partial** (shell + new material; остальные standalone — по мере распила) |
| 3 | Унифицировать публичный API навигации (`navigateToStandalone…` / `open…`) в одном реестре | **done** (`HUB_BOARD_QUICK_CREATE`) |
| 4 | Свести дубли `init*Standalone` и логики create в один путь `beginCreateMode` | **partial** (`Record` в `initStandaloneDictionaryCreateFromRoute`) |
| 5 | Проверить все `close*Modal` на безопасность при повторном вызове | **partial** (аудит в бэклоге ранее; без слепого `if (!isOpen)` для propagation) |
| 6 | Единый источник child-маршрутов standalone | **done** |
| 7 | E2E/smoke: все сегменты `/справочники/…` без 404 | **partial** (Jest-контракт; см. [dictionaries-runtime-notes](dictionaries-runtime-notes.md)) |
| 8 | Deep link: прямой заход по URL на каждый standalone create | **partial** (тесты + URL-таблица) |
| 9 | Сверка канонических URL в доках и коде | **done** |
| 10 | Ручной прогон: Save на каждом standalone → `back` + таблица обновлена | **partial** ([чеклист](dictionaries-standalone-manual-checklist.md)) |
| 11 | Назад без сохранения — нет залипших quick-add флагов | **done** |
| 12 | Регресс: геометрия/единица из модалки материала | **partial** ([§12](dictionaries-regression-scenarios.md)) |
| 13 | Регресс: цепочка материал ↔ характеристика | **partial** ([§13](dictionaries-regression-scenarios.md)) |
| 14 | Цвет/отделка/покрытие: propagation только из модалки | **partial** ([§14](dictionaries-regression-scenarios.md)) |
| 15 | Заголовки страниц vs `dictionaries-naming-convention.md` | **done** (§7 naming + meta titles) |
| 16 | Фокус после открытия standalone (политика) | **done** (`afterNextRender` → первый input в shell / new-material) |
| 17 | Скролл к первой ошибке на длинных формах | **done** (`scrollToFirstInvalidControlInForm` + все `submit*` модалок хаба с `id="…-form"`; см. [runtime-notes](dictionaries-runtime-notes.md), раздел про пункт 17) |
| 18 | Визуальное выравнивание shell и `newMaterialPage` | **done** (общий `_new-material-page-layout.scss`) |
| 19 | Мобильная вёрстка тулбара (узкий viewport) | **done** (media query в общем layout) |
| 20 | `aria-label` / landmarks для полноэкранных форм | **done** (`main`, `aria-labelledby`, кнопка «Назад») |
| 21 | Связь h1 с main-регионом при необходимости | **done** (`[id]` на h1 + `aria-labelledby`) |
| 22 | Единообразие текстов ошибок полей | **partial** (канон в naming / playbook; без массовой замены строк) |
| 23 | OnPush у вынесенных standalone-компонентов | **done** (shell + new-material fullscreen) |
| 24 | Лишние `loadItems` при навигации — профилирование | **partial** ([заметки](dictionaries-runtime-notes.md)) |
| 25 | Размер lazy-chunk `dictionaries-hub-feature` | **partial** ([заметки](dictionaries-runtime-notes.md)) |
| 26 | Юнит: маппинг path ↔ key | **done** |
| 27 | Юнит: `navigateBackFromStandaloneDictionaryCreate` / close* | **done** |
| 28 | E2E: хаб → + → сохранить → хаб | **partial** (нет Playwright; ручной чеклист) |
| 29 | E2E: цепочка материал → характеристика | **partial** |
| 30 | Guards: наследование прав от `/справочники` задокументировано | **done** |
| 31 | Ручной проход видимости create по ролям | **partial** ([rbac-чеклист](dictionaries-rbac-manual-checklist.md)) |
| 32 | Сценарии editor vs admin для ролей/пользователей | **partial** ([rbac-чеклист](dictionaries-rbac-manual-checklist.md)) |
| 33 | Playbook: таблица ключ → URL → title | **done** |
| 34 | `temporary-deviations-log.md` при отклонениях | **done** (файл актуален; записей open нет) |
| 35 | README в `dictionaries-hub-feature` | **done** |
| 36 | Grep: устаревшие TODO по модалкам | **done** |
| 37 | ESLint unused / мёртвый код после рефакторинга | **partial** (периодически `nx affected -t lint`; после снятия Excel на хабе — без отдельных валидаторов-листов) |
| 38 | Объединить дубли стилей `.newMaterialPage` / shell | **done** |
| 39 | Дубли `app.routes` устранены через фабрику маршрутов | **done** |
| 40 | Строгая типизация `standaloneCreate` | **done** |
| 41 | Централизовать `back()` после submit | **done** |
| 42 | Async submit: единый паттерн захвата standalone | **done** (док: [runtime-notes](dictionaries-runtime-notes.md)) |
| 43 | CrudLayout «+» = быстрый выбор «+» | **done** (`HUB_BOARD_QUICK_CREATE` для плитки хаба) |
| 44 | Массовый импорт вне плиток хаба | **superseded** (Excel UI снят; пилот JSON — `POST /api/admin/bulk/units`, см. `dev-bulk-json-migration-checklist.md`) |
| 45 | Toast после сохранения (если по design-system) | **partial** ([runtime-notes](dictionaries-runtime-notes.md)) |
| 46 | Логирование ошибок submit (prod/dev политика) | **partial** ([runtime-notes](dictionaries-runtime-notes.md)) |
| 47 | Поведение при ошибке сети / неуспешном submit | **partial** ([runtime-notes](dictionaries-runtime-notes.md)) |
| 48 | Query `?debug=` для route data (внутренняя отладка) | **done** (`isDevMode` + `console.debug`) |
| 49 | Скриншот-тесты ключевых standalone | **partial** ([runtime-notes](dictionaries-runtime-notes.md)) |
| 50 | CI: lint + test + build + лимит размера `dictionaries-page.ts` | **done** (`npm run check:dictionaries-page-size` + workflow) |

Обновляйте статусы по мере закрытия пунктов.
