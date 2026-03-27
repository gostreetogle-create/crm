# New Dictionary Checklist

Короткий рабочий чеклист для запуска новой CRUD-фичи в `/dictionaries`.
Использовать в каждой новой задаче как "Definition of Ready/Done".

**Поведение полей (таблица / модалка / сценарии / Excel):** [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md).

Для manufacturing: реестр полей, бэклог и шлюз «ок, пункт N» — [`справочники/README.md`](../../справочники/README.md). Сводная бизнес-логика домена: [`business-logic-canon.md`](../business-logic-canon.md).

## Manufacturing: первый поток (порядок внедрения до REST)

Один пункт за раз: согласовали поля в чате → фронт (mock + `/dictionaries` + Excel create-only) → позже HTTP-репозиторий. **Порядок внедрения** по смыслу: опорные справочники (единицы, цвет, …) **до** полноценного заполнения материалов; на экране `/dictionaries` карточка **«Материалы» может быть сверху** — это про удобство, не про порядок первого ввода данных. Перед полями «цена/стоимость» — [`costing-and-dictionary-prices.md`](./costing-and-dictionary-prices.md) и [`business-logic-canon.md`](../business-logic-canon.md).

1. **Вид работ** (`Справочник_Вид_работ`) — уже в UI (ставка ₽/ч для труда).
2. **Единицы измерения** — выравнивание под JSON (ОКЕИ, тип величины).
3. **Цвет (RAL)** — при необходимости доменный `Код` и т.д.
4. **Тип отделки / шероховатость** — `Код`, `ГОСТ` по JSON.
5. **Форма и габаритные размеры** — сверка с JSON.
6. **Покрытие** — после цвета (логика FK в БД позже).
7. **Материалы** — последним в потоке (связи с п.3–6).

## 1) Контракт и данные

- [ ] Создана модель: `src/app/features/<entity>/model/<entity>-item.ts`
- [ ] Создан контракт репозитория: `src/app/features/<entity>/data/<entity>.repository.ts`
- [ ] Создан mock-репозиторий: `src/app/features/<entity>/data/<entity>.mock-repository.ts`
- [ ] Создан store: `src/app/features/<entity>/state/<entity>.store.ts`

## 2) Подключение в раздел справочников

- [ ] Подключены providers в `src/app/app.routes.ts` внутри route `path: 'dictionaries'`
- [ ] В `dictionaries-page` добавлен блок таблицы через `CrudLayout`
- [ ] Для create/edit добавлена `UiModal`-форма
- [ ] Для delete добавлено подтверждение (`confirmDeleteAction`)
- [ ] Подтверждение delete выполнено через `UiModal` (не `window.confirm`)

## 3) UI-канон (обязательно)

- [ ] `CrudLayout` в "чистом" режиме: без `subtitle` и `[facts]` (если не согласовано отдельно)
- [ ] Row actions — иконки (без текстовых кнопок), включая view/duplicate/edit/delete
- [ ] Нейминг согласован с `docs/frontend/dictionaries-naming-convention.md` (длинное/короткое, ГОСТ-style сокращения)
- [ ] **Таблица vs модалка:** в `TableColumn.label` — короткие подписи; в `UiFormField` внутри `UiModal` (create/edit/view) — **полные** подписи полей. Ключи колонок (`key`) и поля TS/API не переименовывать.
- [ ] Для справочника единиц: длинное название карточки `Единицы измерения`; в **колонках** таблицы — `Ед. изм.`; в **модалке** полей — полные подписи (см. naming convention).
- [ ] Для справочника отделки: длинное название карточки `Тип отделки / шероховатость`; в **колонках** — `Тип отд.` и `Шерох.`; в **модалке** — полные подписи, где места достаточно.
- [ ] Excel-кнопки в toolbar идут из `CrudLayout` (шаблон/импорт/экспорт), без локального самодельного UI
- [ ] Включить `showExcelActions=true` для каждого нового справочника (единый стандарт)
- [ ] Видимость Excel-кнопок привязана к правам (`excel.template` / `excel.import` / `excel.export`)
- [ ] Для всех справочников включен единый доступ к кнопке `Скачать шаблон` через `permissions.can('excel.template')`
- [ ] Зафиксировать, какие Excel-кнопки активны по ролям (`template/import/export`) через `permissions.can(...)`
- [ ] Формы на Reactive Forms
- [ ] Поля через `UiFormFieldComponent` / `UiCheckboxFieldComponent`
- [ ] Тексты ошибок — на русском и рядом с полем

## 4) Роли и права

- [ ] Create-кнопки в шаблоне под `*appHasPermission="'crud.create'"`
- [ ] Duplicate-кнопки в шаблоне под `permissions.crud().canDuplicate` или `*appHasPermission="'crud.duplicate'"`
- [ ] View-кнопка открывает modal в режиме read-only
- [ ] Edit/Delete защищены в шаблоне и в TS через `permissions.can(...)`
- [ ] Проверены роли:
  - [ ] `admin` -> create/duplicate/edit/delete
  - [ ] `editor` -> create/duplicate/edit
  - [ ] `viewer` -> read-only

## 5) Согласованность с эталоном

- [ ] Визуал сверен с `/demo` (блок "Универсальный CRUD")
- [ ] Нет расхождений Demo vs `/dictionaries` по базовому каркасу таблицы
- [ ] Нет расхождений Demo vs `/dictionaries` по Excel-toolbar (template/import/export + права видимости)
- [ ] Правка применена не точечно: все карточки этого паттерна синхронизированы в том же изменении
- [ ] Если полная синхронизация невозможна сейчас — создан checklist-долг (конкретные места + срок + критерий закрытия)

## 6) Проверки перед сдачей

- [ ] `nx build crm-web` выполнен успешно
- [ ] lint-проверка измененных файлов без новых ошибок
- [ ] Документация обновлена:
  - [ ] `docs/frontend/dictionaries-crud-playbook.md` (если менялись общие правила)
  - [ ] feature-doc для нового справочника (примеры: `docs/frontend/work-types-crud.md`, `docs/frontend/geometries-crud.md`)
  - [ ] при временных отклонениях: `docs/frontend/temporary-deviations-log.md`
- [ ] Пройден `docs/frontend/pr-checklist.md`

## Быстрый шаблон задачи

Скопируй в начало новой задачи:

1. Добавить `<entity>` в `/dictionaries` по `dictionaries-crud-playbook.md`.
2. Соблюсти роли (`*appHasPermission` + `permissions.can`).
3. Сохранить "чистый" `CrudLayout` без `subtitle/facts`.
4. Прогнать build/lint и обновить docs.

