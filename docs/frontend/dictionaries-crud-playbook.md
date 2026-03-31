# Dictionaries CRUD Playbook

Цель: единый шаблон для добавления новых справочников в `/dictionaries` без расхождений с Demo и без дублирования логики.

Поведение полей и сценарии заполнения (create/edit/view/duplicate, placeholder, Excel): [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md).

Правила данных, импорта/экспорта и проход по справочникам перед крупными этапами: [`dictionaries-data-and-import-rules.md`](./dictionaries-data-and-import-rules.md).

Роли, ключи `page.*` / `dict.hub.*` / `crud.*` / `excel.*`, guard маршрутов, `/settings`, справочники «Роли» и «Пользователи»: [`rbac-and-admin-settings.md`](./rbac-and-admin-settings.md), [`users-dictionary.md`](./users-dictionary.md).

Визуальное единообразие UI (пиксель-чеклист): [`visual-consistency-checklist.md`](./visual-consistency-checklist.md).

### Именование задачи: «карточка цветов» ≠ только цвета

Все плитки на хабе рисуются **одним** `CrudLayout`. Если в задаче сказано «на карточке цветов поправь кнопку/таблицу/отступ» без уточнения **«только эта плитка»**, исполнитель делает правку в **`CrudLayout` (shared)**, чтобы одинаково обновились **все** справочники и эталон на `/demo`. Упоминание конкретного справочника в такой формулировке — обычно **указание места, где заметили проблему**, а не разрешение менять один feature.

Явное исключение одной плитки — только по тексту задачи + запись в `temporary-deviations-log.md`. Подробнее: `development-workflow.md` → раздел «Как понимать формулировки про карточку на хабе».

## Канон (что обязательно)

1. Базовый экран справочников: `src/app/features/dictionaries/pages/dictionaries-page/`.
2. Визуальный эталон плитки хаба: на `/demo` секция **«Плитка справочника: варианты (визуальный эталон)»** — сравнение вариантов композиции (хаб с раскрытием, полный список без кнопки, превью без раскрытия, узкая карточка) и та же базовая цепочка `dictionaryGrid` → `app-dictionary-hub-tile` (опционально `[fullWidth]="true"` для плитки на всю ширину сетки) → `app-hub-crud-expandable-shell` → `content-card` → `CrudLayout`, что на `/dictionaries`. Сами плитки витрины рендерятся **вне** внешней `content-card` intro, в том же `dictionaryGrid`, что и хаб, чтобы ширина колонки (≈ одна четверть `.page`) совпадала с `/dictionaries`. Превью **одной строки** и кнопка раскрытия на продуктовом хабе: обёртка `app-hub-crud-expandable-shell` (`crm-web/libs/ui-kit/src/lib/hub-crud-expandable/`, импорт сервисов/компонентов из `@srm/ui-kit`), состояние по ключу плитки в `HubCrudExpandStateService`, привязка к `CrudLayout` через `maxTableBodyRows` / `tableBodyMaxHeight` (как в `dictionaries-page` и вариант 1 на demo). Раскрытый список рисуется **поверх** контента ниже плитки (без проталкивания страницы); резерв высоты в потоке при открытии = **высота всего** `app-hub-crud-expandable-shell` в свёрнутом виде (синхронно при клике на раскрытие + `ResizeObserver` при изменении данных); иначе fallback `layoutReserveWhenOpen`. У хоста компонента задан `display: block`, у панели `flow-root`, чтобы margin дочерней карточки не ломал измерение. Клик **вне** плитки сворачивает её; кнопка с тремя линиями остаётся внизу раскрытой панели.
3. Для таблиц в справочниках используем `CrudLayout` в "чистом" режиме:
   - только `title + columns + data + actions`,
   - без `subtitle` и `facts` (если не согласовано отдельно).
4. Действия в строке — иконки, не текст (минимум: view/duplicate/edit/delete).
5. Excel-действия (`шаблон/импорт/экспорт`) подключаются через `CrudLayout` как единый стандарт для всех справочников.
6. Create/Edit/Delete/Duplicate доступны по ролям через `PermissionsService` + `*appHasPermission`.
7. Любая правка визуального/поведенческого CRUD-паттерна вносится сразу во все связанные блоки (`/demo` + `/dictionaries` + активные справочники), без частичных "точечных" фиксов.
8. **Таблица на хабе (узкий список):** одна колонка `hubLine` с **коротким заголовком по смыслу** справочника (например `Ед. изм.`, `Цвет`, `Материал`, не универсальное «Запись»). Текст строки в `hubLine` внутри проекции `*Data` в SignalStore. Колонка **Действия** без изменений. Полные поля — в модалках и в Excel. **Визуальное единство:** при 1–2 колонках данных `CrudLayout` включает режим `crudTableHub` (`table-layout: fixed`). При **ровно одной** колонке данных и строке действий тело таблицы — **одна ячейка `colspan`**: внутри flex «текст (ellipsis) + кнопки», кнопки справа с фоном плитки и лёгким перекрытием конца строки, чтобы на узкой плитке **не терялись «Действия»** и не требовался горизонтальный скролл. **`tableViewHubClip`** включается в этом режиме; при двух колонках данных + действия остаётся классическая сетка и при необходимости `overflow-x: auto`. **Исключение по таблице:** плитка **«Материалы»** с `[fullWidth]="true"` — несколько колонок по полям строки (`materialsColumns` + `materialsData` в store), без одной длинной склейки в `hubLine`; при узком вьюпорте допускается горизонтальный скролл у `.tableView`.

**Стандарт ширины плитки:** для любого нового «крупного обзора» на хабе использовать **тот же** `app-dictionary-hub-tile` с `[fullWidth]="true"`. Не заводить отдельные wide-компоненты и не задавать `grid-column` вручную в feature — только этот флаг; поведение раскрытия и контракт высоты таблицы те же, что у узкой плитки (`HubCrudExpandStateService` + `crud-layout`). 9. **Заголовок карточки в `CrudLayout`:** при `showCardLabel=true` название — **отдельной строкой сверху** (`crudCardHeading`, по центру); **ниже** один ряд: доп. действия и `+` слева, поиск по центру (растягивается), Excel справа (`crudToolbarStackedRow`). Так на всех плитках хаба текст не конкурирует с кнопками по ширине.

## Порядок: единый хаб и никакого «теневого» UI

1. **Канонический экран справочников — только `/dictionaries`.** Весь пользовательский CRUD по справочникам живёт в хабе (`dictionaries-page` и дочерние компоненты). Редиректы вроде `/materials` → `/dictionaries` и `/geometries` → `/dictionaries` — для старых ссылок, не для второго параллельного UI.
2. **Запрещено:** отдельная страница CRUD в `features/<entity>/pages/...` + `*.routes.ts`, если этот маршрут **не подключён** в `app.routes.ts` и дублирует хаб. Такой код создаёт расхождение («куда править?») и обязан быть удалён или официально подключён в том же PR с синхронизацией с хабом.
3. **Новый справочник — порядок в коде:** домен остаётся в `features/<entity>/` (model, data, state). **Разметка и логика блока** на экране хаба — в отдельном компоненте `src/app/features/dictionaries/components/<entity>-dictionary/` (или согласованное имя); `dictionaries-page` вставляет компонент. **Не наращивать** `dictionaries-page.ts` сотнями строк на каждый новый справочник: без выноса — только с записью в `temporary-deviations-log.md` и сроком/планом вынести. Уже существующий монолитный хаб допускается до поэтапного распила.
4. **Провайдеры** репозитория и store для справочника подключаются в `app.routes.ts` внутри route `path: 'dictionaries'` (как сейчас). Отдельный feature-`routes.ts` заводим только если маршрут реально импортируется в `app.routes.ts`.

## Архитектура новой фичи-справочника

Создавать по структуре:

- `src/app/features/<entity>/model/<entity>-item.ts`
- `src/app/features/<entity>/data/<entity>.repository.ts`
- `src/app/features/<entity>/data/<entity>.mock-repository.ts`
- `src/app/features/<entity>/state/<entity>.store.ts`

Подключение в `/dictionaries`:

- провайдеры в `src/app/app.routes.ts` внутри route `path: 'dictionaries'`,
- UI-блок: предпочтительно **отдельный компонент** в `src/app/features/dictionaries/components/...` (см. раздел «Порядок» выше), подключённый в шаблоне `dictionaries-page`;
- внутри блока: таблица `CrudLayout`, create через API `CrudLayout` (`showCreateAction` + `(create)`), модалки create/edit, delete с confirm.

## Роли и права (обязательный минимум)

Полный канон: [`rbac-and-admin-settings.md`](./rbac-and-admin-settings.md). Кратко:

- Новый **ключ права** — `authz.types.ts` → `authz.catalog.ts` (+ при плитке хаба `dict-hub-permissions.ts` и обёртка плитки в шаблоне).
- Новая **бизнес-роль** — запись в справочнике «Роли» + галочки в «Админ-настройках», без enum ролей в коде.
- Проверки в UI: входы `CrudLayout`, `permissions.can(...)`, при необходимости `*appHasPermission`.

Для новой кнопки/действия:

1. Добавить проверку в шаблоне через входы `CrudLayout` (`canCreate`, `canEdit`, `canDelete`, и т.д.) или `*appHasPermission`.
2. Дублировать guard в методе TS через `permissions.can(...)`.

Нельзя делать отдельные страницы под роли, если меняется только доступ к действиям.

## UX-стандарт CRUD в `/dictionaries`

- Create/Edit: через `UiModal`.
- View: через `UiModal` в режиме read-only.
- Delete: только через подтверждение в `UiModal` (не нативный `window.confirm`).
- Если справочник используется в связанной таблице с денормализованными snapshot-полями (сейчас это `Color`, `SurfaceFinish`, `Coating` и поля в `MaterialCharacteristic`), то при Edit/Delete используемой записи показываем модалку `Данные связаны`:
  - `Изменить локально` — не переписываем snapshot-поля (оставляем как историю);
  - `Изменить во всех связанных` — переписываем/очищаем snapshot-поля во всех связанных строках.
    Детали ожиданий и формулировка — см. [`dictionaries-data-and-import-rules.md`](./dictionaries-data-and-import-rules.md) (§3).
- Excel в toolbar: через встроенные события `CrudLayout` (`downloadTemplate` / `importExcel` / `exportExcel`), без локальных кнопок.
- Поиск по названию в toolbar: встроенный в `CrudLayout`, располагается между create-кнопкой (`+`) и Excel-кнопками.
- Роли для Excel-кнопок: через `permissions.can('excel.template'|'excel.import'|'excel.export')`.
- Анти-хаос правило: Excel toolbar всегда подключается единообразно через `CrudLayout` во всех справочниках.
- Текущее состояние эталона: `showExcelActions=true` во всех карточках `/dictionaries`; права управляют видимостью отдельных кнопок.
- Жесткий gate: изменения в CRUD/Excel сначала отражаются в `/demo` (эталон), затем в `/dictionaries` в том же изменении.
- Нейминг (обязательно): все длинные/короткие наименования брать только из `docs/frontend/dictionaries-naming-convention.md`.
- Для справочника единиц измерения:
  - название карточки (длинное): `Единицы измерения`,
  - сокращение для полей/колонок: `Ед. изм.`.
- Для справочника отделки:
  - название карточки (длинное): `Тип отделки / шероховатость`,
  - сокращения для полей/колонок: `Тип отд.` и `Шерох.`.
- Для справочника цветов RAL:
  - поле/колонка названия всегда полное: `Название`,
  - в title модалки для режима вставки используем короткий тег после дефиса: `— Цвет`.
  - в create-форме поле `Код RAL` стартует с дефолтом `RAL ` для единообразия ввода.
- Для всех справочников в режиме просмотра (`View`) заголовок модалки строится в формате:
  - `Просмотр <длинное название> — <короткое название>`.
- Подписи: в колонках `CrudLayout` — короткие; в полях формы внутри `UiModal` (create/edit/view) — полные. Канон: `docs/frontend/dictionaries-naming-convention.md` (§4).
- Формы: Reactive Forms + `UiFormFieldComponent`/`UiCheckboxFieldComponent`.
- Плотность полей: compact-режим (уменьшенная высота полей, светлая линия границы).
- Если в форме больше 5 полей, прокрутка идет внутри модалки (контентная зона), без роста окна.
- Ошибки валидации: на русском, рядом с полем.
- Стили: только theme tokens, без локальных палитр.

### Полноэкранное создание (дочерние маршруты под `/справочники`)

При **разных** child-маршрутах (`''`, `новый-материал`, `новая-характеристика-материала`) Angular подгружает **отдельный** экземпляр `DictionariesPage`. Состояние «цепочки» между экранами (флаг «пришли с формы материала», отложенный `id` для подстановки) **нельзя** держать в сигналах компонента — при смене маршрута экземпляр уничтожается. Канон: сервис в `DICTIONARIES_ROUTE_PROVIDERS` (например `DictionariesMaterialStandaloneFlowService`).

Когда create вынесен на отдельный маршрут (полноэкранная форма под тем же shell, что и хаб), **канон завершения** совпадает с кнопкой «Назад»:

1. **Не** делать жёсткий `router.navigate` на корень хаба после успешного «Сохранить» — возврат на **предыдущий шаг истории** через **`Location.back()`** (или эквивалент одного шага назад), чтобы пользователь оказался там, откуда открыл форму (хаб, другой экран, предыдущая полноэкранная форма).
2. После сохранения список в store обновляется асинхронно: при необходимости **дождаться появления** созданной записи в store (короткий опрос по «снимку» полей payload) и только затем вызывать `back()`.
3. Если цепочка явно предполагает возврат **в родительскую форму** с подстановкой новой ссылки (пример: с «Новый материал» открыли «Новая характеристика материала» — после сохранения характеристики в поле материала должна подставиться только что созданная характеристика), сохранить `id` новой сущности и применить к полю **после** навигации назад: при повторном входе на маршрут родителя `effect`/инициализация может **полностью сбросить** форму — тогда подстановку делают **после** этого сброса (отложенный `id` в сигнале/сервисе), а не только `setValue` до `back()`. Флаги «нужна подстановка» / отложенный `id` сбрасывать при «Назад» без сохранения и после успешной подстановки.
4. Тот же паттерн (**`back` + при необходимости patch родителя**) применять к **похожим сценариям** (вложенное создание справочника с возвратом в форму выше по потоку), если не согласовано иное.

#### Эталон в коде (материал ↔ характеристика)

| Что | Где |
|-----|-----|
| Shell с `router-outlet` | `crm-web/libs/dictionaries-hub-feature/src/lib/pages/dictionaries-shell/dictionaries-shell.ts` |
| Дочерние маршруты + `data` | `crm-web/srm-front/src/app/app.routes.ts` (и при необходимости `crm-web/src/app/app.routes.ts`) — `path: 'новый-материал'`, `новая-характеристика-материала` |
| Сервис цепочки + отложенный `id` | `crm-web/libs/dictionaries-hub-feature/src/lib/dictionaries-material-standalone-flow.service.ts` |
| Регистрация сервиса | `crm-web/libs/dictionaries-hub-feature/src/lib/dictionaries-route.providers.ts` → `DICTIONARIES_ROUTE_PROVIDERS` |
| Логика форм, Save/Back, polling store, `afterNextRender` для standalone | `crm-web/libs/dictionaries-hub-feature/src/lib/pages/dictionaries-page/dictionaries-page.ts` |
| Единый список ключей/URL/title для create «как у материалов» (все плитки кроме материала/характеристики) | `crm-web/libs/dictionaries-hub-feature/src/lib/standalone-dictionary-create.meta.ts` (`STANDALONE_DICTIONARY_CREATE`) |
| Фабрика child-маршрутов (тот же список — без дублирования в `app.routes`) | `buildStandaloneDictionaryCreateChildRoutes()` в `standalone-dictionary-create.routes.ts`, подключение: `...buildStandaloneDictionaryCreateChildRoutes()` |
| Канонические сегменты URL + контракт с `app.routes` | `dictionaries-canonical-paths.ts` (`canonicalDictionariesChildSegments`, `canonicalDictionariesUrls`); тесты `dictionaries-canonical-paths.spec.ts`, `app.routes.dictionaries.contract.spec.ts` (`crm-web/src/app/`, `srm-front/src/app/`) |
| Оболочка «назад + заголовок + контент + действия» | `crm-web/libs/dictionaries-hub-feature/src/lib/components/dictionary-standalone-create-shell/` (`app-dictionary-standalone-create-shell`) |
| Бэклог полировки (50 пунктов, статусы) | [`dictionaries-polish-backlog.md`](./dictionaries-polish-backlog.md) |

#### Канонические URL под `/справочники` (deep link / smoke)

Пользовательский вход: **`/справочники`** (кириллица). Редиректы с латиницы (`/dictionaries`, `/materials`, `/geometries` → `/справочники`) — только для старых закладок.

Полный список дочерних путей не дублируйте вручную: в коде — `canonicalDictionariesUrls()` / `STANDALONE_DICTIONARY_CREATE`; ниже — снимок для документации.

| Полный URL | `route.data` / назначение |
|------------|-------------------------|
| `/справочники` | Хаб (пустой сегмент `''`) |
| `/справочники/новый-материал` | `newMaterialPage: true` |
| `/справочники/новая-характеристика-материала` | `newMaterialCharacteristicPage: true` |
| `/справочники/новый-вид-работ` | `standaloneCreate: 'workTypes'` |
| `/справочники/новая-единица-измерения` | `standaloneCreate: 'units'` |
| `/справочники/новая-геометрия` | `standaloneCreate: 'geometries'` |
| `/справочники/новый-цвет-ral` | `standaloneCreate: 'colors'` |
| `/справочники/новая-отделка` | `standaloneCreate: 'surfaceFinishes'` |
| `/справочники/новое-покрытие` | `standaloneCreate: 'coatings'` |
| `/справочники/новая-организация` | `standaloneCreate: 'organizations'` |
| `/справочники/новый-контакт` | `standaloneCreate: 'clients'` |
| `/справочники/новая-роль` | `standaloneCreate: 'roles'` |
| `/справочники/новый-пользователь` | `standaloneCreate: 'users'` |

Guards: родительский маршрут `path: 'справочники'` задаёт `canActivate: [authGuard, permissionGuard]` и `data: { permission: 'page.dictionaries' }`; дочерние маршруты не повторяют guard — проверка выполняется при навигации на любой из URL выше.

Smoke без браузера: `nx test dictionaries-hub-feature`, `nx test crm-web --testPathPattern=app.routes.dictionaries`, `nx test srm-front --testPathPattern=app.routes.dictionaries`.

Ручной прогон Save/таблица по каждому standalone: [`dictionaries-standalone-manual-checklist.md`](./dictionaries-standalone-manual-checklist.md).

Регресс материал ↔ справочники, propagation: [`dictionaries-regression-scenarios.md`](./dictionaries-regression-scenarios.md).

Роли / ручные сценарии: [`dictionaries-rbac-manual-checklist.md`](./dictionaries-rbac-manual-checklist.md). Рантайм, toast, E2E-ограничения: [`dictionaries-runtime-notes.md`](./dictionaries-runtime-notes.md).

#### Чеклист: следующая полноэкранная таблица или цепочка A → B

Использовать тот же подход, что и для «Новый материал» / «Новая характеристика материала»:

1. **Маршрут** — отдельный `path` под `справочники`, свой `loadComponent: DictionariesPage`, в `data` либо специализированный флаг (`newMaterialPage`), либо **`standaloneCreate: '<key>'`** по канону `STANDALONE_DICTIONARY_CREATE`; добавить строку в meta-файл и дочерний маршрут в `app.routes.ts` (srm-front + при необходимости `crm-web/src/app`).
2. **Не хранить** «цепочку» и `pendingId` в сигналах **`DictionariesPage`** — при смене child-маршрута экземпляр страницы пересоздаётся. Расширить существующий flow-сервис **или** завести новый `@Injectable()` и добавить в `DICTIONARIES_ROUTE_PROVIDERS`.
3. **Инициализация** полноэкранной формы при входе на маршрут — через **`afterNextRender`** в конструкторе по `route.snapshot.data[...]` (как сейчас), а не через `effect` на флаг маршрута, чтобы не получить повторный сброс формы и потерю подставленных значений.
4. **Переход** с родительской полноэкранной формы A на дочернюю B — перед `router.navigate` на B вызвать на сервисе что-то вроде `markChainFromParentStandalone()` (условно: только если `isNewParentPageRoute()`).
5. **Сохранение** на B (standalone): дождаться строки в store → на сервисе `afterChildSaved(created.id)` (кладёт `pendingId`, снимает флаг цепочки) → `Location.back()`; при таймауте поиска — `cancelFlow()` и всё равно `back()` по продуктовому решению.
6. **Вход обратно на A**: в `init...StandaloneForm` — **сначала** `consumePending...Id()` из сервиса, **потом** сброс формы, **потом** `setValue` в поле ссылки на созданную сущность.
7. **«Назад» без сохранения** с B — `cancelFlow()` на сервисе, затем `back()`.
8. После изменений — `nx build crm-web` и ручная проверка: A → B → Сохранить → поле на A заполнено; A → B → Назад — без подстановки.

## Чеклист перед merge

1. Сверить с `/demo` визуальный каркас таблицы.
2. Проверить роли:
   - `admin`: create/duplicate/edit/delete,
   - `editor`: create/duplicate/edit,
   - `viewer`: read-only.
3. Проверить, что в UI нет `subtitle`/`facts` в `CrudLayout` для нового справочника (если не согласовано).
4. Выполнить:
   - `nx build crm-web`
   - lint-check измененных файлов.
5. Обновить docs:
   - этот playbook при изменении общих правил,
   - feature-doc для нового справочника.
6. Подтвердить отсутствие "точечных" расхождений:
   - проверить все карточки справочников на единый паттерн,
   - если где-то синхронизация отложена, добавить явный checklist-долг (что, где, до какого этапа).

## Реестр manufacturing (предметная область)

Плановый реестр полей и статусов `exists`/`new`, расхождения с текущим UI (`domainVsUi`), нумерованный бэклог и шлюз согласования «пункт N» перед внедрением: [`справочники/README.md`](../../справочники/README.md) и JSON [`справочники/crm-manufacturing-dictionaries.json`](../../справочники/crm-manufacturing-dictionaries.json). Черновики до канона — в `справочники/tips/manufacturing/`.

## Реестр manufacturing (JSON)

Канонический реестр предметной области и правила папки `справочники/` (в т.ч. синхронизация `status` с UI): [`справочники/README.md`](../../справочники/README.md).
