# Dictionaries CRUD Playbook

Цель: единый шаблон для добавления новых справочников в `/dictionaries` без расхождений с Demo и без дублирования логики.

## Канон (что обязательно)

1. Базовый экран справочников: `src/app/features/dictionaries/pages/dictionaries-page/`.
2. Визуальный эталон таблицы: блок `Универсальный CRUD` на `/demo`.
3. Для таблиц в справочниках используем `CrudLayout` в "чистом" режиме:
   - только `title + columns + data + actions`,
   - без `subtitle` и `facts` (если не согласовано отдельно).
4. Действия в строке — иконки, не текст (минимум: view/duplicate/edit/delete).
5. Excel-действия (`шаблон/импорт/экспорт`) подключаются через `CrudLayout` как единый стандарт для всех справочников.
6. Create/Edit/Delete/Duplicate доступны по ролям через `PermissionsService` + `*appHasPermission`.
7. Любая правка визуального/поведенческого CRUD-паттерна вносится сразу во все связанные блоки (`/demo` + `/dictionaries` + активные справочники), без частичных "точечных" фиксов.

## Архитектура новой фичи-справочника

Создавать по структуре:

- `src/app/features/<entity>/model/<entity>-item.ts`
- `src/app/features/<entity>/data/<entity>.repository.ts`
- `src/app/features/<entity>/data/<entity>.mock-repository.ts`
- `src/app/features/<entity>/state/<entity>.store.ts`

Подключение в `/dictionaries`:

- провайдеры в `src/app/app.routes.ts` внутри route `path: 'dictionaries'`,
- UI-блок в `dictionaries-page`:
  - таблица `CrudLayout`,
  - toolbar с create-кнопкой,
  - модалка create/edit,
  - delete с confirm.

## Роли и права (обязательный минимум)

Права задаются только через:

- `src/app/core/auth/authz.types.ts`
- `src/app/core/auth/authz.matrix.ts`
- `src/app/core/auth/permissions.service.ts`

Для новой кнопки/действия:

1. Добавить проверку в шаблоне: `*appHasPermission="'crud.create'"` (или `crud.edit` / `crud.delete`).
2. Дублировать guard в методе TS через `permissions.can(...)`.

Нельзя делать отдельные страницы под роли, если меняется только доступ к действиям.

## UX-стандарт CRUD в `/dictionaries`

- Create/Edit: через `UiModal`.
- View: через `UiModal` в режиме read-only.
- Delete: только через подтверждение в `UiModal` (не нативный `window.confirm`).
- Excel в toolbar: через встроенные события `CrudLayout` (`downloadTemplate` / `importExcel` / `exportExcel`), без локальных кнопок.
- Роли для Excel-кнопок: через `permissions.can('excel.template'|'excel.import'|'excel.export')`.
- Анти-хаос правило: Excel toolbar всегда подключается единообразно через `CrudLayout` во всех справочниках.
- Текущее состояние эталона: `showExcelActions=true` во всех карточках `/dictionaries`; права управляют видимостью отдельных кнопок.
- Жесткий gate: изменения в CRUD/Excel сначала отражаются в `/demo` (эталон), затем в `/dictionaries` в том же изменении.
- Формы: Reactive Forms + `UiFormFieldComponent`/`UiCheckboxFieldComponent`.
- Ошибки валидации: на русском, рядом с полем.
- Стили: только theme tokens, без локальных палитр.

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

