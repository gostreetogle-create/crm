# Material-geometry page (стартовая в crm-web)

Страница `material-geometry` показывает поля новой модели справочников `material` и `geometry` в виде таблиц.

## Логика страницы

1. Контейнер/фон/шапка — через shared-компоненты `PageShellComponent` и `PageHeaderComponent` (без отдельного `material-geometry-page.scss`).
2. Табличные блоки — через shared-компоненты:
   - `app-content-card` (`ContentCardComponent`)
   - `app-fields-table` (`FieldsTableComponent`)

## Файлы

- Страница (feature):
  - `crm-web/src/app/features/material-geometry/pages/material-geometry-page/material-geometry-page.ts`
  - `crm-web/src/app/features/material-geometry/pages/material-geometry-page/material-geometry-page.html`

- Shared UI:
  - `crm-web/src/app/shared/ui/content-card/content-card.component.ts/.scss`
  - `crm-web/src/app/shared/ui/fields-table/fields-table.component.ts/.html/.scss`
  - `crm-web/src/app/shared/model/field-row.ts` (тип данных для таблиц)

## Версия модели

На странице отображается версия модели из поля `version`, полученного через `MaterialGeometryRepository`.

