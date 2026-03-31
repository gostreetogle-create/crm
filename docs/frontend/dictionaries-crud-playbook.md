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
