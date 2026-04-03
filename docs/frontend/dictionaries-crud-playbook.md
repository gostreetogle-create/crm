# Dictionaries CRUD Playbook

Цель: держать единый CRUD-контур для словарей, без дублирования и расхождения между `crm-web` и `srm-front`.

## 1. Канон маршрутов

- Базовый пользовательский путь: `/справочники`.
- Legacy redirects (`/dictionaries`, `/materials`, `/geometries`) должны вести на `/справочники`.
- Redirect-сегменты задаются shared-константой (`DICTIONARIES_PUBLIC_REDIRECT_SEGMENTS`), а не копируются вручную.
- Child routes под `/справочники` собираются фабрикой (`buildStandaloneDictionaryCreateChildRoutes`) + contract tests.

## 2. Канон CRUD-компоновки

- Каркас таблицы/toolbar/actions — shared паттерн (`CrudLayout`).
- Доменные различия допустимы только в:
  - field contracts,
  - payload builders,
  - валидации,
  - локальных modal-сценариях.
- Любая правка "карточки справочника" по умолчанию трактуется как правка общего шаблона.

## 3. Field contracts и формы

- Поля описываются в typed helpers/контрактах, не только в шаблоне.
- `create/edit/view` должны использовать одинаковые имена и маппинги полей.
- При переименовании/добавлении поля одновременно обновляются:
  - form model,
  - payload builder,
  - table columns,
  - тесты контракта.

## 4. Что запрещено

- Неподключенные/теневые CRUD-страницы рядом с хабом.
- Локальные исключения поведения без записи в `temporary-deviations-log.md`.
- Точечные route-фиксы только в одном из приложений (`crm-web` или `srm-front`).

## 5. Минимальный quality gate для PR

1. Route parity checks проходят.
2. Guard на mega-file не нарушен.
3. Нет несогласованных полей между form/table/payload.
4. Любые временные отклонения зафиксированы в `temporary-deviations-log.md`.

## 6. Standalone create: сохранение и пустая таблица на хабе

Симптом: пользователь нажал **Создать** на полноэкранной форме (`data.standaloneCreate`), вернулся на хаб — в таблице **«Нет данных»**, хотя запись на бэкенде могла создаться.

Типичные причины:

1. **Гонка с навигацией** — сразу после вызова `SignalStore.submit` (rxMethod) вызываются `close*Modal` и `location.back()`. Цепочка HTTP (`create` → `getItems`) не успевает обновить store до смены маршрута; параллельно конструктор страницы хаба вызывает `loadItems()` для всех справочников, и **последний** успешный ответ определяет содержимое списка. Итог: пустая таблица или устаревшие строки.
2. **Забыли вызов `*Store.loadItems()`** в конструкторе/инициализации `DictionariesPage` для нового справочника — список никогда не подгружается (отдельный класс багов).
3. **Миграции БД** не применены — в DevTools для `/api/...` часто **500** (Prisma: таблицы для новой модели ещё не созданы). Из каталога `backend/`: `npx prisma migrate status`; если есть «not yet been applied» — `npx prisma migrate deploy` (или `migrate dev` в разработке). После подтяжки ветки с новыми миграциями всегда прогонять миграции до проверки UI.

**Канон исправления для п.1:** для сценария standalone после валидного submit **дождаться** завершения сохранения и обновления списка (например `await firstValueFrom(repo.create(...))`, затем `getItems()` и явный `applyLoadedItems` / эквивалент), и только потом вызывать `finishStandaloneDictionaryCreateIfMatch` / `location.back()`. Референс: изделия — `submitProducts` в `dictionaries-page.ts` и `applyLoadedItems` в `products.store.ts`.

При добавлении **нового** полноэкранного create проверьте чеклист в `dictionaries-standalone-manual-checklist.md`.
