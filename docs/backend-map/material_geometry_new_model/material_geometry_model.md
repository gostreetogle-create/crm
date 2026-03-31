# Название файла: .md — Новая модель справочников `material`/`geometry`

Цель: в новой модели сначала строим **единичные справочники**, без привязки к существующим таблицам.

Файлы размещены в `docs/backend-map/material_geometry_new_model/`. JSON (`material_geometry_entities.json`) **входит** в общий реестр и таблицы сущностей в [`OVERVIEW.generated.md`](../OVERVIEW.generated.md): скрипт `scripts/generate-backend-map-overview.cjs` обходит все `*.json` под `docs/backend-map/` **рекурсивно**. Этот `.md` — дополнительное человекочитаемое резюме таблицами.

## `material` — Материал

| Поле | Русское имя | Тип | Required | Комментарий |
|---|---|---|---|---|
| `id` | Идентификатор | `uuid` | да | PK |
| `organizationId` | Организация | `uuid` | да | Tenant |
| `name` | Наименование | `string` | да | — |
| `code` | Код | `string` | нет | — |
| `densityKgM3` | Плотность (кг/м3) | `float` | нет | База для будущих расчетов веса |
| `properties` | Свойства материала | `json` | нет | Универсальное хранилище тех.параметров |
| `colorName` | Цвет (название) | `string` | нет | Для UI |
| `colorHex` | Цвет (HEX) | `string` | нет | Например `#2F6BFF` |
| `notes` | Заметки | `string` | нет | — |
| `isActive` | Активен | `boolean` | нет | Деактивация вместо удаления |

## `geometry` — Геометрия

| Поле | Русское имя | Тип | Required | Комментарий |
|---|---|---|---|---|
| `id` | Идентификатор | `uuid` | да | PK |
| `organizationId` | Организация | `uuid` | да | Tenant |
| `name` | Наименование | `string` | да | — |
| `shapeKey` | Тип геометрии | `string` | да | Ключ типа/формулы: `rectangular/cylindrical/tube/plate/custom` |
| `heightMm` | Высота (мм) | `float` | нет | — |
| `lengthMm` | Длина (мм) | `float` | нет | — |
| `widthMm` | Ширина (мм) | `float` | нет | — |
| `diameterMm` | Диаметр (мм) | `float` | нет | — |
| `thicknessMm` | Толщина (мм) | `float` | нет | — |
| `extraParameters` | Доп. параметры (универсально) | `json` | нет | Кастомные параметры для нестандартных формул |
| `notes` | Заметки | `string` | нет | — |
| `isActive` | Активен | `boolean` | нет | Деактивация вместо удаления |

## Унификация для будущих расчетов

- Единицы для геометрических полей: `мм` (в названии полей `*Mm`).
- Для расчёта веса в будущем: `densityKgM3` (из `material`) + подходящий набор полей геометрии (в зависимости от `shapeKey`) + опционально `extraParameters`.

