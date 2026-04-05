# Справочники «Каталог»: комплексы, каталожные товары, позиции

**Доменная модель и отличие от производственного изделия:** [`docs/domain/catalog-suite-guide.md`](../domain/catalog-suite-guide.md).

**Код (фронт):** секция **«Каталог»** на хабе `/справочники`, три плитки; сторы `ComplexesStore`, `CatalogProductsStore`, `CatalogArticlesStore`; репозитории в `crm-web/libs/catalog-suite-data-access/`; формы и модалки в `dictionaries-page` + пейлоады в `dictionaries-page-catalog-suite.ts`.

**Код (бэк):** DTO `backend/src/lib/catalog-suite.dto.ts`; роуты под префиксом authed API с проверкой **`dict.hub.catalog_suite`** (см. `backend/README.md`).

---

## Плитки хаба и права

| Ключ плитки (`hubBoard`) | Заголовок в UI | Право (все три → одно) |
|--------------------------|----------------|-------------------------|
| `catalogComplexes` | Комплексы | `dict.hub.catalog_suite` |
| `catalogProducts` | Каталожные товары | то же |
| `catalogArticles` | Позиции каталога | то же |

Маппинг плитка → ключ права: `crm-web/libs/authz-core/src/lib/dict-hub-permissions.ts`.

**Не вижу секцию «Каталог»:** как и для других плиток, нужна галочка в матрице прав для роли (**«Плитка „Комплексы и каталог“»** в каталоге прав) или суперадмин. Роли с **`dict.hub.trade_goods`** при загрузке матрицы могут получить **`dict.hub.catalog_suite`** неявно (augment на бэкенде) — см. `backend/README.md`.

---

## API (контракт для интеграций)

| Ресурс | Базовый путь | Фильтр списка |
|--------|--------------|---------------|
| Комплексы | `GET|POST /api/complexes`, `PUT|DELETE /api/complexes/:id` | — |
| Каталожные товары | `GET|POST /api/catalog-products`, `PUT|DELETE /api/catalog-products/:id` | `GET ?complexId=` (опционально) |
| Позиции каталога | `GET|POST /api/catalog-articles`, `PUT|DELETE /api/catalog-articles/:id` | `GET ?productId=` (опционально) |

Типы ответов и тел POST/PUT совпадают с моделями в `@srm/catalog-suite-data-access` (`ComplexItem` / `CatalogProductItem` / `CatalogArticleItem` и `*Input`).

Производственные изделия (BOM к деталям) по-прежнему **`/api/products`** — это **другая** сущность в БД (`ManufacturedProduct` → таблица `"Product"`).

---

## UI: создание и зависимости

1. Сначала имеет смысл завести **комплексы** (плитка «Комплексы»).
2. **Каталожный товар** требует выбранного **комплекса** (`complexId`).
3. **Позиция каталога** требует выбранного **каталожного товара** (`productId`).

Быстрый **«+»** у строки на доске хаба открывает модалку создания для соответствующей плитки (без отдельного standalone-маршрута).

Удаление комплекса при ссылках снизу на уровне БД ограничено (`onDelete: Restrict`); при ошибке FK смотрите ответ API и консоль сети.

---

## Связанные документы

- [`products-dictionary.md`](./products-dictionary.md) — справочник **«Изделия»** (производство), не путать с каталожными товарами.
- [`dictionaries-crud-playbook.md`](./dictionaries-crud-playbook.md) — общий CRUD-хаб.
- [`new-dictionary-checklist.md`](./new-dictionary-checklist.md) — чеклист новых справочников.
- [`backend/README.md`](../../backend/README.md) — миграции, права, перечень маршрутов.
