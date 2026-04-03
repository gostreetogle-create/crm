# Справочник «Изделия»

**Код:** плитка `products` на хабе `/dictionaries`, формы в `dictionaries-page-products.ts`, стор `ProductsStore`, API `GET|POST /api/products`, `PUT|DELETE /api/products/:id`.

**Состав изделия:** одна или несколько строк (`ProductLine`) — деталь производства (`productionDetailId`), опционально переопределение вида работ (`workTypeId`) и цвета (`colorId`). Цена/себестоимость на шапке изделия; при пустых значениях на бэкенде подставляется сумма итогов по строкам деталей (как в форме).

---

## Excel: единый файл админа и плитка хаба

Колонки **одинаковые** в двух местах:

1. **Единый импорт/экспорт** (шаблон и выгрузка всех справочников): `POST /api/admin/excel-dictionaries/import`, лист **«Изделия»** (`sheetName` в коде: `Products`). Реализация: `backend/src/lib/excel-dictionaries/excel-dictionaries.service.ts` — адаптер `Products` (после листа «Детали»).
2. **Плитка «Изделия»** на хабе: кнопки шаблон / импорт / экспорт в `CrudLayout`, обработчики в `dictionaries-page.ts` (`exportProductsExcel`, `downloadProductsTemplateExcel`, `onProductsExcelImported`), валидация строк в `dictionaries-page-excel-validate-products.ts`.

### Формат листа (одна строка = одна строка состава)

| Колонка | Смысл |
|--------|--------|
| ID изделия | UUID существующего изделия. **Пусто** — создаётся новое. **Заполнено** — обновление этой записи (состав перезаписывается целиком). |
| Наименование изделия | Обязательно. |
| Цена ₽, Себестоимость ₽ | Числа; пусто — подстановка суммы по итогам выбранных деталей. |
| Заметки | Текст. |
| Активен | да / нет. |
| Порядок | Порядок строки в составе (необязательно; по умолчанию порядок строк в файле). |
| ID детали | UUID из справочника «Детали производства». Обязательно. |
| ID вида работ | Опционально; UUID из «Вид работ». |
| ID цвета | Опционально; UUID из «Цвета (RAL)». |

Несколько строк с **одинаковым** «Наименование изделия» (и пустым «ID изделия») или с **одинаковым** «ID изделия» объединяются в одно изделие.

Импорт на плитке: после успешной загрузки список обновляется через `productsRepository.getItems()` и `applyLoadedItems`.

---

## При смене полей или заголовков колонок

Менять **согласованно** (одни и те же русские заголовки):

- `backend/src/lib/excel-dictionaries/excel-dictionaries.service.ts` — массив `productSheetHeaders`, `templateSampleRows`, `parseRow`, экспорт в `buildUnifiedExcelExportBuffer` (`case 'Products'`), при необходимости кэш `existingByIdCache.productionDetail` для импорта.
- `crm-web/.../dictionaries-page.ts` — `productsExcelHeaders()`, строки в `exportProductsExcel` / `downloadProductsTemplateExcel`.
- `crm-web/.../dictionaries-page-excel-validate-products.ts` — ключи `row['…']` и проверки.
- этот файл и раздел Excel в [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md).

Тесты заголовков (если есть): `dictionaries-page-table-columns.spec.ts` / Excel-спеки — по поиску `Products` / `Изделия`.

---

## Связанные документы

- [`dictionary-field-behavior-guide.md`](./dictionary-field-behavior-guide.md) — общий канон полей и Excel.
- [`dictionaries-data-and-import-rules.md`](./dictionaries-data-and-import-rules.md) — правила импорта и нормализации.
- [`dictionaries-crud-playbook.md`](./dictionaries-crud-playbook.md) — CRUD и гонки загрузки.
