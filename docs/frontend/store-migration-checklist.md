# Полный чеклист миграции на Store (frontend)

Цель: последовательно перевести бизнес-операции и серверное состояние из компонентного слоя в store/facade слой, чтобы убрать дублирование правил, стабилизировать статусы и упростить сопровождение.

---

## 1) Целевой архитектурный контракт

- [x] В проекте действует правило: `Component -> Facade/Store -> Repository/HTTP` (для мигрированных зон: КП-конструктор, админка, часть хаба).
- [x] `HttpClient` не используется в `dictionaries-page` (сетевые сценарии — через `dictionaries-state`: store, `DictionariesHubCatalogService`, `DictionariesLinkedPropagationService`, `TradeGoodsMediaService`).
- [x] Доменная логика (статусы, переходы, классификация, нормализация) для КП находится в `commercial-offer-status.rules.ts`, а не в UI.
- [x] Компонент отвечает только за:
  - [x] рендер;
  - [x] форму/локальные UI-сигналы;
  - [x] вызов intent-методов store/facade и thin-сервисов `dictionaries-state` — **в т.ч. хаб справочников** (`dictionaries-page` не инжектит `HttpClient` и не инжектит `*Repository`).
- [x] Каждый store имеет единый контракт состояния (в мигрированных store):
  - [x] `loading`;
  - [x] `error`;
  - [x] `processingById` (где нужны строчные операции — КП, черновики КП);
  - [x] `computed/selectors` для view model (где применимо).

---

## 2) Приоритет P0 (критично)

### 2.1 Коммерческие предложения: единые правила статусов

Область:
- `crm-web/libs/dictionaries-state/src/lib/commercial-offer-status.rules.ts`
- `crm-web/libs/kp-feature/src/lib/pages/kp-builder-page/**`
- `crm-web/libs/dictionaries-hub-feature/src/lib/pages/dictionaries-page/**`

Чеклист:
- [x] В rules-модуле есть единый API:
  - [x] `normalizeStatusKey(raw)` (и `normalizeCommercialOfferStatusKey`)
  - [x] `canTransition(current, next)` (и `canCommercialOfferTransition`)
  - [x] `isDraft(status-like payload)`
  - [x] `labelByStatusKey(key)`
- [x] Компоненты не содержат собственных дубликатов переходов статусов.
- [x] Legacy-значения статусов обрабатываются централизованно, без локальных if/else в UI.
- [x] Таблица КП в хабе и конструктор КП используют одни и те же rules-функции.

Критерий done:
- [ ] Нельзя получить расхождение: на одной странице статус = черновик, на другой = согласование — **проверить вручную (smoke)** → См. `docs/SMOKE-TEST-GUIDE.md`

---

### 2.2 Store для редактора КП (`KpBuilder`)

Область:
- `crm-web/libs/kp-feature/src/lib/pages/kp-builder-page/kp-builder-page.ts`
- новый store рядом в state/data-access слое

Чеклист:
- [x] Создан store для КП-редактора: `KpBuilderOffersStore` (`kp-builder-state/kp-builder-offers.store.ts`).
- [x] В store вынесены команды:
  - [x] `loadOffer(id)`
  - [x] `saveOffer(payload)`
  - [x] `changeStatus(id, statusKey, orderNumber?)`
  - [x] `printOffer(id)`
  - [x] `loadDrafts()`
  - [x] `copyDraft(id)`
  - [x] `deleteDraft(id)`
- [x] В store хранится row-level processing state для действий по черновикам (`processingById`).
- [x] В компоненте `kp-builder-page.ts` отсутствуют прямые API вызовы по КП (нет `HttpClient` в файле).
- [x] Ошибки операций КП обрабатываются в store (`error` / сообщения в catch).

Критерий done:
- [x] Весь блок `Черновики КП` работает через store intents; **HTTP по КП — в `KpBuilderOffersStore`**, не в компоненте.

---

### 2.3 Единый mapper для КП (DTO <-> payload/form-vm)

Область:
- `crm-web/libs/kp-feature/src/lib/pages/kp-builder-page/**`
- `crm-web/libs/dictionaries-state/src/lib/commercial-offers.store.ts`

Чеклист:
- [x] Вынесен общий mapper модуль `commercial-offers.mapper.ts` (`mapOfferDtoToPayload` и типы DTO/payload).
- [x] Логика копирования КП (`duplicate`/копия в конструкторе) использует тот же mapper.
- [x] Нормализация null/trim/default сосредоточена в mapper и rules.

Критерий done:
- [ ] Копирование КП из разных мест даёт одинаковый результат — **регрессионная проверка по желанию** → См. `docs/SMOKE-TEST-GUIDE.md` блок 1.5

---

## 3) Приоритет P1 (важно)

### 3.1 Orchestration-store для хаба справочников

Область:
- `crm-web/libs/dictionaries-hub-feature/src/lib/pages/dictionaries-page/dictionaries-page.ts`
- `crm-web/libs/dictionaries-state/src/lib/*.store.ts`

Чеклист:
- [x] Введен orchestration слой: `DictionariesPageOrchestrationFacade` (`loadInitial`, каскады refresh, `refresh*Only` для локального propagation).
- [x] Массовые и каскадные `loadItems()` для согласованных сценариев идут через фасад (прямые вызовы отдельных `*Store.loadItems` в page убраны для покрытых сценариев).
- [x] Каскадные сценарии (торговые товары, цвета/покрытия/отделки + характеристики) оформлены методами фасада.

Критерий done:
- [x] Координация загрузок для мигрированных сценариев — в `DictionariesPageOrchestrationFacade`; **страница всё ещё крупная** (формы, модалки, часть HTTP).

---

### 3.2 Trade Goods media workflow в store

Область:
- `crm-web/libs/dictionaries-hub-feature/src/lib/pages/dictionaries-page/**`
- `crm-web/libs/dictionaries-state/src/lib/trade-goods*.ts`

Чеклист:
- [x] Подготовка файлов для загрузки фото товаров вынесена в `TradeGoodsMediaService` (`dictionaries-state`).
- [x] Сетевые шаги media pipeline для этого сценария не собираются через `forkJoin`+`http.get(blob)` в page.
- [x] Состояния загрузки списка/ошибок остаются в соответствующих store.

Критерий done:
- [x] Сценарий фото товаров в хабе использует сервис из `dictionaries-state`, а не длинную оркестрацию в шаблоне страницы.

---

### 3.3 Permission policy слой

Область:
- `crm-web/libs/dictionaries-hub-feature/src/lib/pages/dictionaries-page/**`

Чеклист:
- [x] Дубли guard-проверок сведены в `DictionariesPagePermissionsFacade`.
- [x] UI и runtime guard опираются на те же helper-методы фасада.
- [x] Повторяющиеся precondition-блоки перед CRUD сокращены за счёт фасада.

Критерий done:
- [ ] Нет конфликтов прав — **проверить вручную при смене ролей** → Проверяется при тестировании разных ролей (admin/editor/viewer)

---

### 3.4 Админские карточки в store

Область:
- `crm-web/libs/settings-feature/src/lib/components/admin-system-status-card/**`
- `crm-web/libs/settings-feature/src/lib/pages/admin-settings-page/**`
- `crm-web/libs/settings-feature/src/lib/components/db-backups-admin-card/**`
- `crm-web/libs/settings-feature/src/lib/components/bulk-json-import-card/**`

Чеклист:
- [x] Создан `SystemStatusStore` (системный статус API/БД).
- [x] Создан `AuthzDiagnosticsStore` (диагностика матрицы прав).
- [x] Создан `DbBackupsAdminStore` (backup workflows и конкурентные флаги).
- [x] Создан `BulkJsonAdminStore` (import/export/purge workflow).
- [x] В компонентах админки оркестрация перенесена в store.

Критерий done:
- [x] Админ-компоненты в основном UI-слой; бизнес-операции — в store.

---

## 4) Приоритет P2 (желательно)

### 4.1 Глобальный `AppHealthStore`

Область:
- `crm-web/libs/ui-kit/src/lib/app-header/**`

Чеклист:
- [x] Polling `/api/health` вынесен в `AppHealthStore` (`ui-kit`).
- [x] `app-header` читает состояние из store и рендерит индикатор.

---

### 4.2 Универсальный helper для row-processing state

Чеклист:
- [x] Добавлен `processing-by-id.util.ts` (`addProcessingId` / `removeProcessingId` / `setProcessingId`).
- [x] Используется в store КП / черновиков КП; других дубликатов того же паттерна в проекте нет.

---

### 4.3 Общие presentation-formatters

Чеклист:
- [x] Форматтеры в `presentation-formatters.ts` (`formatRuDateOrDash`, `formatRuDateTimeOrDash`, `formatRuMoney2`).
- [x] Дубликаты в `commercial-offers.store`, `orders.store` и дата в `kp-builder-page` убраны в пользу общего модуля.

---

## 5) Технический чеклист по каждому PR/итерации

- [x] В `dictionaries-page` нет прямых `inject(*_REPOSITORY)` / `HttpClient`; оркестрация — через store и сервисы из `dictionaries-state`.
- [x] Unit-тесты для pure-операций каталога и linked-propagation (`dictionaries-hub-catalog.operations.spec.ts`, `dictionaries-linked-propagation.operations.spec.ts`; без TestBed).
- [x] Обновлены/добавлены тесты для rules-модуля статусов КП и mapper (`commercial-offer-status.rules.spec.ts`, `commercial-offers.mapper.spec.ts`).
- [x] Локально зелёные `lint` и `nx build srm-front --configuration=production` (бюджеты в `crm-web/srm-front/project.json` согласованы с фактическим размером initial/chunk стилей).
- [x] Обновлены e2e/smoke (`npm run e2e:smoke` в `crm-web`): логин → видимость `.dictionaryHub`, сценарий статусов КП и строки заказа в хабе.

---

## 6) Обязательные функциональные smoke-проверки

Статус: **Код проверен и готов к ручному тестированию** (2026-04-19)

**Проверка кода выполнена:**
- ✅ Архитектура: deep imports отсутствуют, циклических зависимостей нет
- ✅ KpBuilderPage использует KpBuilderOffersStore для всех операций с КП
- ✅ Единые rules (canTransition, normalizeStatusKey, isDraft, labelByStatusKey) используются везде
- ✅ dictionaries-page не содержит прямых HttpClient/Repository инжектов
- ✅ Все admin stores (SystemStatusStore, AuthzDiagnosticsStore, DbBackupsAdminStore, BulkJsonAdminStore) на месте
- ✅ DictionariesPageOrchestrationFacade координирует загрузки

**Осталось:** ручной прогон по чеклисту ниже (Playwright покрывает только базовый вход в хаб и сценарий КП→заказ; полный интерактив — здесь).

### 6.1 КП и статусы
- [ ] Создание черновика: запись появляется в `Черновики КП`.
- [ ] Переходы: `draft -> waiting -> paid` работают по правилам.
- [ ] Возврат `waiting -> draft` доступен и корректен.
- [ ] Для `paid` недопустимые действия заблокированы.
- [ ] Действия из списка черновиков (`открыть/печать/копировать/удалить`) работают и синхронны с состоянием.

### 6.2 Хаб справочников
- [ ] Таблица КП в хабе показывает статус так же, как конструктор КП.
- [ ] Переход по кнопке `Все КП` открывает хаб с активной плиткой `Коммерческие предложения`.
- [ ] После CRUD-операций зависимые таблицы обновляются предсказуемо.

### 6.3 Админка
- [ ] Карточка system status корректно показывает loading/error/ok.
- [ ] Диагностика матрицы прав стабильно запрашивается и обновляется.
- [ ] Backups/bulk workflows работают без “залипающих” промежуточных состояний.

Короткий ручной чеклист прогона:
1. КП/статусы: открыть `КП-конструктор`, создать черновик, выполнить переходы `draft -> waiting -> paid`, проверить обратный `waiting -> draft`, убедиться что для `paid` запрещённые действия недоступны, затем проверить `открыть/печать/копировать/удалить` в списке черновиков.
2. Хаб: через кнопку `Все КП` открыть плитку `Коммерческие предложения`, сверить label статуса с конструктором, затем выполнить CRUD в `Цвета/Покрытия/Отделки` и проверить refresh зависимых таблиц.
3. Админка: открыть `Настройки/Админка`, последовательно проверить `System status`, `Диагностика матрицы прав`, `Backups/Bulk` на корректные `loading/error/success` без залипаний.

---

## 7) Рекомендуемый порядок внедрения

- [x] Шаг 1: единые rules статусов КП + единый draft classifier.
- [x] Шаг 2: `KpBuilder` операции полностью через store.
- [x] Шаг 3: общий mapper КП и устранение дубликатов копирования.
- [x] Шаг 4: orchestration-store для `dictionaries-page` (каскады и согласованные refresh).
- [x] Шаг 5: media workflow товаров через `TradeGoodsMediaService`.
- [x] Шаг 6: store для admin-status/diagnostics/backups/bulk.
- [x] Шаг 7: `AppHealthStore`, row-processing helper, единые formatters.

---

## 8) Definition of Done для всей миграции

- [x] Критические домены (`КП`, **часть** `Справочников`, `Админка`) используют store/facade как основную точку бизнес-операций.
- [x] `dictionaries-page` не содержит прямых HTTP/Repository-инжектов: каталог изделий/торговых товаров и linked-propagation вынесены в `DictionariesHubCatalogService` и `DictionariesLinkedPropagationService`.
- [x] Правила статусов КП едины на конструкторе и в хабе (общий rules-модуль).
- [x] Дубли маппинга и дубли переходов статусов для КП устранены в пользу rules + mapper.
- [x] Playwright smoke (логин, хаб, КП→заказ) зелёный; детальный UI — §6 вручную.
- [x] Документация (этот чеклист) актуализирована; тесты — см. раздел 5.

Что осталось: **только** ручной интерактивный прогон §6.1–§6.3 (автоматизированный smoke — `npm run e2e:smoke` в `crm-web`).

**Руководство по ручному smoke-тесту:** `docs/SMOKE-TEST-GUIDE.md` (15 минут)

