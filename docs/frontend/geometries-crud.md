# Форма и габаритные размеры — CRUD в `/dictionaries`

Типовые пресеты геометрии заготовки/профиля (мм). Используются в справочниках и далее в расчётах (масса/площадь — по мере появления бэка). См. `crm-manufacturing-dictionaries.json` и `docs/business-logic-canon.md` при согласовании.

Единый паттерн полей и режимов UI: [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md).

## Где в коде

- Модель: `crm-web/src/app/features/geometries/model/geometry-item.ts`
- Правила «тип формы → какие мм поля видны и обязательны»: `crm-web/src/app/features/geometries/utils/geometry-shape-config.ts`
- Формат строки «Параметры» (таблица, экспорт): `crm-web/src/app/features/geometries/utils/format-geometry-params-display.ts`
- Mock + репозиторий: `geometries/data/`
- Store (в т.ч. `params` для таблицы): `geometries/state/geometries.store.ts`
- UI-блок, модалка: `dictionaries-hub-feature/.../dictionaries-page/` (отдельного маршрута/страницы CRUD нет)
- На хабе `/dictionaries` все справочники в сетке одинаковой плиткой `dictionaryTile` (несколько плиток в ряд). Класс `dictionaryTileWide` в SCSS оставлен на будущее, если понадобится одна плитка на всю ширину сетки.
- Провайдеры: `app.routes.ts` (route `dictionaries`)

## Поля (домен ↔ UI)

| Домен (JSON)   | TS           | Примечание |
|----------------|--------------|------------|
| Тип_геометрии  | `shapeKey`   | `rectangular` / `tube` / `plate` / `cylindrical` / `custom` |
| размеры мм     | `*Mm`        | Набор полей зависит от `shapeKey`; прямоугольная труба/брус — `rectangular`, опционально толщина |
| Заметки        | `notes`      | |
| Активна        | `isActive`   | |

Подпись поля диаметра в форме: знак **⌀** в label (`GEOMETRY_DIAMETER_LABEL`). В таблице колонка **«Параметры»** — компактная строка, не пять отдельных колонок.

## Массовый импорт (JSON / Admin API)

На плитке нет файлового импорта. Для будущего `POST /api/admin/bulk/geometries` (условное имя) в payload нужны как минимум имя, `shapeKey` и параметры в том же смысле, что компактная строка **«Параметры»** в таблице (мм). Форматы текстовой строки параметров (легенда **В / Дл / Ш / …** или компактная строка с **×** / ⌀) следует либо перенести в серверный парсер, либо заменить на явные числовые поля в JSON — решение фиксируется в спецификации endpoint.

Ориентир отображения и редактирования в UI: `format-geometry-params-display.ts`, `geometry-shape-config.ts`.

## Backend (позже)

HTTP-репозиторий и переключение `GEOMETRIES_REPOSITORY` с mock; контракт DTO совпадает с `GeometryItem` / `GeometryItemInput`.
