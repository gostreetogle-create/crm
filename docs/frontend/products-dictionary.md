# Справочник «Изделия»

**Код:** плитка `products` на хабе `/dictionaries`, формы в `dictionaries-page-products.ts`, стор `ProductsStore`, API `GET|POST /api/products`, `PUT|DELETE /api/products/:id`.

**Состав изделия:** одна или несколько строк (`ProductLine`) — деталь производства (`productionDetailId`), опционально переопределение вида работ (`workTypeId`) и цвета (`colorId`). Цена/себестоимость на шапке изделия; при пустых значениях на бэкенде подставляется сумма итогов по строкам деталей (как в форме).

---

## Массовое наполнение (JSON / Admin API)

Единый Excel-импорт и кнопки Excel в `CrudLayout` **сняты**. Массовое создание — через **админские JSON endpoints** (см. `docs/dev-bulk-json-migration-checklist.md`). Пилот: `POST /api/admin/bulk/units`. Для изделий отдельный bulk-route появится при переносе доменной логики с прежнего Excel-потока.

**Ориентир полей** для будущего JSON (одна строка payload ≈ одна строка состава, несколько строк с одним изделием объединяются так же по смыслу):

| Поле | Смысл |
|--------|--------|
| ID изделия | UUID существующего изделия. Пусто — новое; заполнено — обновление (состав перезаписывается целиком). |
| Наименование изделия | Обязательно. |
| Цена ₽, Себестоимость ₽ | Числа; пусто — подстановка суммы по итогам выбранных деталей. |
| Заметки | Текст. |
| Активен | да / нет. |
| Порядок | Порядок строки в составе (необязательно). |
| ID детали | UUID «Детали производства». Обязательно. |
| ID вида работ | Опционально. |
| ID цвета | Опционально. |

После импорта через API список на плитке обновляется обычным `getItems()` / перезагрузкой стора.

---

## При смене полей или схемы импорта

Менять **согласованно**: доменные роуты `products`, формы `dictionaries-page-products`, этот файл и [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md). Тесты колонок таблицы: `dictionaries-page-table-columns.spec.ts` и поиск по `Products` / `Изделия`.

---

## Связанные документы

- [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md) — общий канон полей и массового импорта.
- [`dictionaries-data-and-import-rules.md`](./dictionaries-data-and-import-rules.md) — правила импорта и нормализации.
- [`dictionaries-crud-playbook.md`](./dictionaries-crud-playbook.md) — CRUD и гонки загрузки.
