# Форма и габаритные размеры — CRUD в `/dictionaries`

Типовые пресеты геометрии заготовки/профиля (мм). Используются в справочниках и далее в расчётах (масса/площадь — по мере появления бэка). См. `crm-manufacturing-dictionaries.json` и `docs/business-logic-canon.md` при согласовании.

Единый паттерн полей и режимов UI: [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md).

## Где в коде

- Модель: `crm-web/src/app/features/geometries/model/geometry-item.ts`
- Правила «тип формы → какие мм поля видны и обязательны»: `crm-web/src/app/features/geometries/utils/geometry-shape-config.ts`
- Формат строки «Параметры» (таблица, экспорт): `crm-web/src/app/features/geometries/utils/format-geometry-params-display.ts`
- Mock + репозиторий: `geometries/data/`
- Store (в т.ч. `params` для таблицы): `geometries/state/geometries.store.ts`
- Отдельная страница CRUD: `geometries/pages/geometries-crud-page/`
- UI-блок, модалка и Excel: `dictionaries/pages/dictionaries-page/`
- Провайдеры: `app.routes.ts` (route `dictionaries`)

## Поля (домен ↔ UI)

| Домен (JSON)   | TS           | Примечание |
|----------------|--------------|------------|
| Тип_геометрии  | `shapeKey`   | `rectangular` / `tube` / `plate` / `cylindrical` / `custom` |
| размеры мм     | `*Mm`        | Набор полей зависит от `shapeKey`; прямоугольная труба/брус — `rectangular`, опционально толщина |
| Заметки        | `notes`      | |
| Активна        | `isActive`   | |

Подпись поля диаметра в форме: знак **⌀** в label (`GEOMETRY_DIAMETER_LABEL`). В таблице колонка **«Параметры»** — компактная строка, не пять отдельных колонок.

## Excel

Экспорт: колонки `Название`, `Тип`, `Параметры` (компактный формат как в UI).

Импорт: обязательны `Название`, `Тип`, `Параметры`. Поддерживаются:

1. Легендный формат с метками **В / Дл / Ш / Диам / Толщ** (как раньше).
2. Компактная строка с разделителями **×** (и совместимые `x`, `х`), опциональный хвост `мм`/`mm`, префикс ⌀/Ø у диаметра — разбор по `Тип` (см. `tryParseCompactGeometryParams` в `dictionaries-page.ts`).

Шаблон скачивания: пример строки в компактном виде для `tube`.

## Backend (позже)

HTTP-репозиторий и переключение `GEOMETRIES_REPOSITORY` с mock; контракт DTO совпадает с `GeometryItem` / `GeometryItemInput`.
