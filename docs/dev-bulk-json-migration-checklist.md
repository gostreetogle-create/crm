# Чеклист: убрать Excel (импорт/экспорт) → единый канал JSON + Admin API

Цель: **не остаться с мёртвым кодом и правами**; после прохождения списка — в репозитории нет пользовательских сценариев Excel, зависимость `xlsx` не тянется там, где не нужна; **массовое наполнение** — через **админский JSON API** (и позже при необходимости тонкий UI).

Использование: выполняйте **по порядку**. После каждого крупного блока — поиск «хвостов» (раздел 8).

**Статус кода (2026-04-04):** Excel UI и `/api/admin/excel-dictionaries/*` удалены; пилот JSON — `POST /api/admin/bulk/units`, карточка в админ-настройках, право `admin.bulk.units`; `xlsx` убран из `crm-web` и `backend`; `material-characteristics-excel-import` переименован в `material-characteristics-bulk-import`. Обновлена терминология в ключевых `docs/frontend/*.md`, `справочники/tips/manufacturing/integration-followups-checklist.md`, `analysis_hub/inbox/README.md`. Остаётся ручное: **0.x** (согласование с командой/staging), **6.3** (очистка уже сохранённых матриц с ключами `excel.*` в БД), добить **8.x** по оставшимся вспомогательным doc при появлении ссылок на Excel, **10.4** на staging.

---

## 0. Подготовка

- [ ] **0.1** Зафиксировать в команде: Excel UI и `/api/admin/excel-dictionaries/*` **выводятся из эксплуатации**; замена — JSON bulk (минимум один рабочий endpoint до merge, если удаление Excel в том же релизе).
- [ ] **0.2** Снять копию БД / иметь staging для проверки импорта после смены канала.
- [ ] **0.3** Решить **пилотную сущность** для первого JSON bulk (рекомендация: простой справочник без тяжёлых FK, например `units` или `colors` — по вашей нагрузке).

---

## 1. Спецификация JSON Admin API (до или параллельно с удалением Excel)

- [ ] **1.1** Один базовый контракт ответа: `{ ok, created, updated, errors: [{ path|index, code, message }] }` (уточнить имена под ваш стиль).
- [ ] **1.2** Аутентификация: только **admin** (тот же префикс, что у текущих admin routes), rate limit при необходимости.
- [ ] **1.3** Идемпотентность / режим: **create-only** vs **upsert по id** — явно в доке первого endpoint.
- [ ] **1.4** Порядок зависимостей: либо **одна сущность на запрос**, либо многосущностный пакет с **фиксированным порядком применения** на сервере.
- [ ] **1.5** Валидация: **Zod** (или текущий стек) на теле запроса; ошибки валидации → 400 с детализацией.
- [ ] **1.6** Пример payload и **JSON Schema** или фрагмент OpenAPI в `docs/` (чтобы ИИ и люди копировали эталон).
- [ ] **1.7** Реализовать **пилотный** route, например `POST /api/admin/bulk/<entity>` (имя согласовать), транзакция на батч при необходимости.

---

## 2. Backend: удалить Excel-админку и зависимости

- [ ] **2.1** Удалить регистрацию роутера: `excelDictionariesRouter` из `backend/src/app.ts` (mount `/excel-dictionaries`).
- [ ] **2.2** Удалить файл маршрутов `backend/src/routes/excel-dictionaries.routes.ts`.
- [ ] **2.3** Удалить сервис `backend/src/lib/excel-dictionaries/excel-dictionaries.service.ts` и каталог, если пуст.
- [ ] **2.4** Удалить вспомогательные скрипты: `backend/scripts/merge-excel-dictionaries-templates.mjs`, `backend/scripts/excel-dictionaries-unit-and-integration-smoke.ts` (и упоминания в `package.json` / CI).
- [ ] **2.5** Убрать зависимость **`xlsx`** из `backend/package.json`, если больше нигде не используется (`rg xlsx backend`).
- [ ] **2.6** Обновить **`docs/backend-map/admin_api_routes.json`**: удалить пути `excel-dictionaries`; затем по правилам репозитория запустить генератор overview (не править `OVERVIEW.generated.md` вручную).

---

## 3. Frontend: хаб справочников (`dictionaries-page`)

Удалить всё, что относится к Excel на плитках: обработчики, заголовки колонок Excel, парсеры, валидаторы строк.

- [ ] **3.1** Удалить файлы `dictionaries-page-excel-*.ts` (parse utils + все `validate-*`).
- [ ] **3.2** В `dictionaries-page.ts`: удалить методы `export*Excel`, `download*Template`, `on*ExcelImported`, массивы заголовков Excel, `import('xlsx')`, состояние баннеров импорта Excel (если есть).
- [ ] **3.3** В `dictionaries-page.html`: убрать привязки `(downloadTemplate)`, `(importExcel)`, `(exportExcel)`, `[showExcelActions]`, `[canDownloadTemplate]`, и т.д. у всех `crud-layout`.
- [ ] **3.4** Проверить `dictionaries-page.scss` и вложенные шаблоны на классы/баннеры только под Excel — удалить.
- [ ] **3.5** Удалить или переписать тесты, которые проверяют только Excel (поиск `excel`, `xlsx` в `*.spec.ts` рядом с dictionaries).

---

## 4. UI Kit: `CrudLayout`

- [ ] **4.1** Удалить `@Input() showExcelActions`, `canDownloadTemplate`, `canImportExcel`, `canExportExcel`, `importAccept`.
- [ ] **4.2** Удалить `@Output() downloadTemplate`, `importExcel`, `exportExcel`.
- [ ] **4.3** Удалить шаблон `crudExcelToolbar` и стили `crudToolbarExcel` из `crud-layout.html` / `crud-layout.scss`.
- [ ] **4.4** Удалить методы `hasExcelActions`, `onDownloadTemplate`, обработчик файла, `onExportExcel` из `crud-layout.ts`.
- [ ] **4.5** Прогнать линт по `ui-kit` и всем потребителям `CrudLayout`.

---

## 5. Demo, settings, data-access, утилиты

- [ ] **5.1** `ui-demo-page`: убрать Excel-демо (`exportRowsToExcel`, статусы, биндинги к `CrudLayout`); заменить при необходимости нейтральным примером (без файлов).
- [ ] **5.2** Удалить компонент `excel-dictionaries-admin-card` и стили; убрать из `admin-settings-page` (TS + HTML): якорь TOC «Excel», блок карточки.
- [ ] **5.3** Удалить `libs/settings-core/.../excel-dictionaries-admin.service.ts` и экспорты из `settings-core` index.
- [ ] **5.4** Убрать Excel из имени модуля: `material-characteristics-excel-import` → `material-characteristics-bulk-import` (и тест `material-characteristics-bulk-import.spec.ts`); экспорт из `@srm/dictionaries-utils`.
- [ ] **5.5** Корневой скрипт `scripts/fill-organizations-excel-from-sources.cjs` — удалить или заменить на генерацию JSON (если нужен).

---

## 6. Авторизация и матрица прав

- [ ] **6.1** В `authz-core`: удалить права `excel.template`, `excel.import`, `excel.export` из типов и каталога (`authz.types.ts`, `authz.catalog.ts`).
- [ ] **6.2** Убрать секцию **Excel** из UI матрицы настроек (если отдельный блок в шаблоне/константах — поиск `excel` в `settings-feature` и `authz-runtime` / матрица).
- [ ] **6.3** Обновить **seed / миграцию ролей** (где задаются дефолтные права): удалить ключи `excel.*`; для существующих БД — миграция или одноразовый скрипт очистки JSON матрицы (если права хранятся в БД).
- [ ] **6.4** Добавить новые права для JSON bulk, например `admin.bulk.import` (одно или раздельно по сущностям) — и проверить отображение в матрице.

---

## 7. Зависимости и сборка фронта

- [ ] **7.1** Удалить **`xlsx`** из `crm-web/package.json`, если после чистки нет импортов (`rg "from 'xlsx'|import\\('xlsx" crm-web`).
- [ ] **7.2** `nx build`, `nx test` (затронутые проекты), `nx lint` для affected.
- [ ] **7.3** Проверить размер бандла: чанк `xlsx` должен исчезнуть из отчёта сборки.

---

## 8. Финальный аудит репозитория («ничего не забыли»)

Выполнить из корня репозитория (или эквивалент):

- [ ] **8.1** `rg -i "xlsx|excel-dictionaries|importExcel|exportExcel|showExcelActions|downloadTemplate" --glob '!**/node_modules/**' --glob '!**/dist/**'`
- [ ] **8.2** Отдельно: `rg -i "excel\\." crm-web backend docs` — документация и комментарии.
- [ ] **8.3** `deploy/nginx.conf` — убрать устаревшие комментарии про Excel, если есть.
- [ ] **8.4** Обновить **ключевые** документы (или пометить устаревшими): разделы Excel в `docs/frontend/dictionary-field-behavior-guide.md`, `dictionaries-data-and-import-rules.md`, `new-dictionary-checklist.md`, `rbac-and-admin-settings.md`, `products-dictionary.md`, и т.д. — либо заменить на «JSON bulk», либо короткий redirect-абзац на новый doc.
- [ ] **8.5** Каталог `справочники/` (вне `docs/`): обновить или удалить черновики про «один Excel» (`integration-followups-checklist.md`, упоминания в JSON), чтобы не вводили в заблуждение.

---

## 9. UI для JSON (можно вторым этапом после API)

- [ ] **9.1** Новая карточка в «Админ-настройках»: загрузка `.json` или textarea + `POST` на пилотный endpoint.
- [ ] **9.2** Отображение ответа сервера (ошибки по индексам, успехи).
- [ ] **9.3** Ссылка на эталонный пример JSON в `docs/`.

---

## 10. Критерий готовности («как часы»)

- [ ] **10.1** Нет рабочих маршрутов и UI для Excel import/export/template.
- [ ] **10.2** Нет прав `excel.*` в каталоге и в прод-матрицах после миграции.
- [ ] **10.3** `npm ls xlsx` в `backend/` и `crm-web/` — пусто или только транзитив (если вдруг остался чужой пакет; цель — **не тянуть xlsx в приложение**).
- [ ] **10.4** Пилотный **JSON bulk** проходит happy-path и error-path на staging.
- [ ] **10.5** Документация для ИИ: пример JSON + описание endpoint.

---

## Примечание про объём

Удаление Excel касается **сотен строк** в `dictionaries-page` и крупного `excel-dictionaries.service.ts`. Имеет смысл делать **одним PR** с подзадачами по разделам 2–7, затем отдельный PR на документацию (8), либо один PR с чёткими коммитами по фазам.

После изменений `docs/backend-map/*.json` — **обязательно** регенерация overview по правилам репозитория.
