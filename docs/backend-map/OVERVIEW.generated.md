# Название файла: .md — Обзор backend-map (автогенерация)

> **Сгенерировано:** `2026-03-26T15:35:07.505Z`  
> **Не править вручную.** Источник правды — JSON в этой же папке. Обновление: `node scripts/generate-backend-map-overview.cjs`

---

## Точка входа для «картинки»

Ниже — **все малые справочники** (по файлам) и **все сущности с полями** (по файлам). При добавлении нового `.json` в `docs/backend-map/` перезапусти генератор — раздел появится автоматически.

---

## Реестр JSON-источников

| Файл | Версия | Назначение (_meta.purpose) |
|---|---|---|
| entities_from_dictionaries.json | 1.2 | Сущности (логические таблицы/агрегаты): имя на русском, описание домена, список полей для проектирования БД и форм. |
| material_geometry_new_model/material_geometry_entities.json | 0.1 | Новая модель: сущности для справочников material/geometry/detail. |
| small_dictionaries.json | 1.2 | Малые справочники (кирпичики): перечисления со стабильным machine key и человекочитаемым названием. Их используют поля сущностей в entities_from_dictionaries.json (через ref в description или суффикс Key в имени поля). |

## Малые справочники

### Малые справочники — `small_dictionaries.json`

#### `commercial_document_type` — Тип коммерческого документа

*BL_PAGES: CommercialDocument.*

| key | rus | description |
| --- | --- | --- |
| invoice | Счёт | — |
| contract | Договор | — |

#### `goods_status` — Статусы готовности товара

*WORKFLOW_STATUSES: товар в каталоге.*

| key | rus | description |
| --- | --- | --- |
| goods_ready | Укомплектованы данными | Товар готов к КП/заказам |

#### `order_status` — Статусы заказа (Order)

*Пример ключей из WORKFLOW_STATUSES.*

| key | rus | description |
| --- | --- | --- |
| order_planned | Спланировано | — |
| order_procured | Закуплено | — |
| order_designed | Спроектировано | — |
| order_manufactured | Изготовлено | — |
| order_shipped | Отгружено | — |

#### `permission_bl` — Права: бизнес-действия (bl.*)

*RBAC MVP.*

| key | rus | description |
| --- | --- | --- |
| bl.proposals.edit | КП — редактирование | — |
| bl.proposals.change_status | КП — смена статуса | — |
| bl.proposals.delete | КП — удаление | — |
| bl.orders.read | Заказы — чтение | — |
| bl.documents.shipment | Документы — отгрузка | — |
| bl.documents.work_act | Документы — акт работ | — |
| bl.users.manage | Пользователи — управление | — |

#### `permission_page` — Права: страницы (page.*)

*RBAC базовые keys.*

| key | rus | description |
| --- | --- | --- |
| page.clients.view | Клиенты — просмотр | — |
| page.organizations.view | Организации — просмотр | — |
| page.catalog.view | Каталог — просмотр | — |
| page.proposals.view | КП — просмотр | — |
| page.orders.view | Заказы — просмотр | — |
| page.admin.view | Админка — просмотр | — |

#### `proposal_status` — Статусы КП (Proposal)

*Стабильные key; name можно менять в админке.*

| key | rus | description |
| --- | --- | --- |
| proposal_draft | Черновик | Планируемое расширение; до появления ключа в БД может быть только UI. |
| proposal_waiting | Ожидание | — |
| proposal_approved | Согласовано | — |
| proposal_paid | Оплачено | Фиксирующий статус: версия неизменяема для edit/delete. |

#### `stock_movement_type` — Тип движения остатка

*BL_PAGES: StockMovement.*

| key | rus | description |
| --- | --- | --- |
| in | Приход | — |
| out | Расход | — |
| transfer | Перемещение | — |

#### `system_role` — Системные роли (RBAC)

*RBAC.md: ключи ролей.*

| key | rus | description |
| --- | --- | --- |
| role_director | Директор | — |
| role_manager | Менеджер | — |
| role_accounting | Бухгалтер | — |
| role_production_head | Начальник производства | — |
| role_worker | Рабочий | — |

## Сущности и поля

### Сущности (таблицы) — `entities_from_dictionaries.json`

#### `category` — Категория

*Справочник каталога; tenant organizationId.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | PK |
| organizationId | Организация | uuid | да | Tenant |
| name | Название | string | да | — |
| parentId | Родительская категория | uuid | нет | Дерево, опционально |
| isActive | Активна | boolean | нет | Деактивация вместо удаления при ссылках |
| sortOrder | Порядок сортировки | int | нет | — |

#### `client` — Клиент

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| clientMarkup | Наценка клиента % | float | нет | — |
| discount | Скидка клиента % | float | нет | Предзаполнение discountPercent КП |

#### `commercial_document` — Коммерческий документ

*Счёт/договор.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| typeKey | Тип | string | да | ref → dictionaries.commercial_document_type |
| proposalId | КП | uuid | нет | — |
| orderId | Заказ | uuid | нет | — |
| clientId | Клиент | uuid | да | — |
| number | Номер | string | нет | — |
| documentDate | Дата | date | нет | — |
| status | Статус документа | string | нет | — |

#### `commercial_document_line` — Строка коммерческого документа

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| commercialDocumentId | Документ | uuid | да | — |
| description | Описание | string | нет | — |
| amount | Сумма | float | нет | — |
| proposalItemId | Строка КП (трассировка) | uuid | нет | — |

#### `functionality` — Функциональность

*Справочник; ProductFunctionality.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Название | string | да | — |
| isActive | Активна | boolean | нет | — |

#### `material` — Материал

*Справочник; listPrice — закупка для costPrice.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Название | string | да | — |
| code | Код | string | нет | — |
| notes | Заметки | string | нет | — |
| listPrice | Цена закупки | float | нет | Участвует в расчёте Product.costPrice |
| isActive | Активен | boolean | нет | — |
| unitId | Единица измерения | uuid | нет | Опционально: отдельная сущность Unit или поле |

#### `mount_type` — Вид монтажа

*Справочник; связь с товаром ProductMount.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Название | string | да | — |
| isActive | Активен | boolean | нет | — |

#### `object_address` — Адрес объекта

*Привязка к КП; в доке — либо отдельная сущность, либо поля в Proposal.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| proposalId | КП | uuid | да | — |

#### `operation_assignment` — Назначение работы

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| orderLineId | Строка заказа | uuid | да | — |
| workKindId | Вид работ | uuid | да | — |
| performerId | Исполнитель | uuid | нет | — |
| status | Статус операции | string | нет | — |
| plannedAt | План | datetime | нет | — |
| doneAt | Факт | datetime | нет | — |

#### `order` — Заказ

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| clientId | Клиент | uuid | да | — |
| proposalId | КП (источник) | uuid | нет | — |
| statusKey | Статус | string | да | ref → dictionaries.order_status |

#### `order_line` — Строка заказа

*Снимок товара + комплектация; связь с КП через sourceProposalId + lineNo + скрытый sourceProposalVersionId.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| orderId | Заказ | uuid | да | — |
| lineNo | Номер строки | int | да | — |
| sourceProposalId | КП корень | uuid | нет | — |
| sourceProposalVersionId | Версия КП (скрыто) | uuid | нет | — |
| sourceProposalItemLineNo | Номер позиции в КП | int | нет | — |
| productionCode | Код производства | string | нет | №КП-№пп |
| quantity | Количество | float | да | — |
| unit | Единица | string | нет | — |

#### `organization` — Организация

*Клиент/исполнитель; markup, vat для ценообразования.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| markup | Наценка организации % | float | нет | PRICING: Organization.markup |
| vatPercent | НДС % | float | нет | PRICING: vatPercent |
| prefix | Префикс (PDF шаблоны) | string | нет | PROPOSAL_PDF_TEMPLATES |

#### `part_type` — Тип детали

*PartType; specTemplate для ТЗ.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Название | string | да | — |
| description | Описание / ТЗ | string | нет | — |
| specTemplate | Шаблон спецификации | json | нет | JSON или строка для печати |
| isActive | Активен | boolean | нет | — |

#### `performer` — Исполнитель

*Отдельный справочник или только User — открытый вопрос в BUSINESS_LOGIC.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| userId | Пользователь | uuid | нет | — |
| displayName | ФИО | string | да | — |
| isActive | Активен | boolean | нет | — |

#### `permission` — Право (RBAC)

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| key | Ключ permission | string | да | page.* или bl.* |
| description | Описание | string | нет | — |

#### `product` — Товар

*Логический товар каталога; состав — ProductSpecification; mounts/functionalities — join.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Наименование | string | да | — |
| sku | Артикул/SKU | string | нет | — |
| categoryId | Категория | uuid | да | — |
| partTypeId | Тип детали | uuid | нет | — |
| materialId | Материал (карточка) | uuid | нет | — |
| listPrice | Цена продажи | float | да | База для КП |
| costPrice | Себестоимость | float | нет | Сервер; не правит клиент |
| variants | Легаси-варианты (JSON) | json | нет | Импорт Ø и цены по варианту |
| goodsStatusKey | Статус готовности товара | string | нет | ref → dictionaries.goods_status |

#### `product_specification` — Строка состава товара

*ProductSpecification: тип детали + опц. материал; несколько на товар.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| productId | Товар | uuid | да | — |
| partTypeId | Тип детали | uuid | нет | — |
| materialId | Материал | uuid | нет | — |

#### `proposal_item` — Строка КП (снимок)

*ProposalItem: не пересчитывать из каталога после фиксации.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| proposalVersionId | Версия КП | uuid | да | — |
| lineNo | Номер позиции | int | да | — |
| title | Наименование в строке | string | нет | — |
| lineKind | Тип строки (товар/услуга) | string | нет | Эквивалент из OWNER_DECISIONS |
| isCustom | Произвольная позиция | boolean | нет | — |
| productSpecificationId | Ссылка на спецификацию | uuid | нет | — |
| quantity | Количество | float | да | — |
| unit | Единица | string | нет | — |
| catalogPrice | Каталожная цена (снимок) | float | нет | — |
| orgMarkupPercent | Наценка орг % (снимок) | float | нет | — |
| clientMarkupPercent | Наценка клиента % (снимок) | float | нет | — |
| unitPrice | Цена за единицу | float | да | — |
| lineTotal | Сумма строки | float | да | — |
| vatRate | Ставка НДС (снимок) | float | нет | — |
| lineDiscountPercent | Скидка на строку % | float | нет | — |

#### `proposal_root` — КП (корень)

*Proposal root; номер КП не меняется при версиях 01/02/03.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| number | Номер КП (визуальный) | string | нет | Напр. №0236 |
| clientId | Клиент | uuid | да | — |
| organizationId | Организация (исполнитель) | uuid | да | — |

#### `proposal_version` — Версия КП

*ProposalVersion; шапка, статус, НДС snapshot, скидки.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| proposalId | Корень КП | uuid | да | — |
| versionNo | Номер версии | int | да | 01/02/03 внутренне |
| currentStatusKey | Статус | string | да | ref → dictionaries.proposal_status |
| discountPercent | Скидка на документ % | float | нет | — |
| roundingAmount | Округление / коррекция суммы | float | нет | — |
| targetTotal | Целевая итоговая сумма | float | нет | — |
| vatPercentSnapshot | НДС % (снимок) | float | нет | — |

#### `role` — Роль (RBAC)

*RBAC.md: ключ роли + отображаемое имя.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| key | Ключ роли | string | да | ref/совпадение с dictionaries.system_role |
| name | Название | string | да | — |

#### `role_permission` — Роль — право

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| roleId | Роль | uuid | да | — |
| permissionId | Право | uuid | да | — |

#### `stock` — Остаток

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| warehouseId | Склад | uuid | да | — |
| productSpecificationId | Спецификация | uuid | нет | — |
| sku | SKU | string | нет | — |
| quantity | Количество | float | да | — |
| reservedQuantity | Резерв | float | нет | — |

#### `stock_movement` — Движение склада

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| typeKey | Тип | string | да | ref → dictionaries.stock_movement_type |
| warehouseId | Склад | uuid | да | — |
| quantity | Количество | float | да | — |
| refType | Тип основания | string | нет | — |
| refId | Ид основания | uuid | нет | — |

#### `unit` — Единица измерения

*Опциональная сущность; в BL_PAGES — поле или справочник.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| code | Код | string | да | — |
| name | Название | string | да | — |

#### `user_role` — Пользователь — роль (M2M)

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| userId | Пользователь | uuid | да | — |
| roleId | Роль | uuid | да | — |

#### `warehouse` — Склад

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Название | string | да | — |
| address | Адрес | string | нет | — |
| isActive | Активен | boolean | нет | — |

#### `work_kind` — Вид работ

*Справочник производства.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | — |
| organizationId | Организация | uuid | да | — |
| name | Название | string | да | — |
| code | Код | string | нет | — |
| isActive | Активен | boolean | нет | — |
| sortOrder | Порядок | int | нет | — |

### Сущности (таблицы) — `material_geometry_new_model/material_geometry_entities.json`

#### `geometry` — Геометрия

*Справочник геометрических параметров детали. Форма определяет набор реально используемых полей.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | PK |
| organizationId | Организация | uuid | да | Tenant |
| name | Наименование | string | да | — |
| shapeKey | Тип геометрии | string | да | Ключ формулы/типа геометрии (значения: rectangular/cylindrical/tube/plate/custom). |
| heightMm | Высота (мм) | float | нет | — |
| lengthMm | Длина (мм) | float | нет | — |
| widthMm | Ширина (мм) | float | нет | — |
| diameterMm | Диаметр (мм) | float | нет | — |
| thicknessMm | Толщина (мм) | float | нет | — |
| extraParameters | Доп. параметры (универсально) | json | нет | Для кастомных формул/параметров, которые не укладываются в базовые поля. |
| notes | Заметки | string | нет | — |
| isActive | Активен | boolean | нет | Деактивация вместо удаления при ссылках. |

#### `material` — Материал

*Справочник материалов (сталь, алюминий и т.п.). Содержит параметры для будущих расчетов веса/обработки.*

| key | rus | type | required | description |
| --- | --- | --- | --- | --- |
| id | Идентификатор | uuid | да | PK |
| organizationId | Организация | uuid | да | Tenant |
| name | Наименование | string | да | — |
| code | Код | string | нет | — |
| densityKgM3 | Плотность (кг/м3) | float | нет | База для расчетов веса в будущем. |
| properties | Свойства материала | json | нет | Универсальное хранилище тех.параметров (марка стали, термообработка, доп. свойства). |
| colorName | Цвет (название) | string | нет | Для визуального выбора в UI. |
| colorHex | Цвет (HEX) | string | нет | Например: #2F6BFF. Если не нужен — можно не заполнять. |
| notes | Заметки | string | нет | — |
| isActive | Активен | boolean | нет | Деактивация вместо удаления при ссылках. |

## Открытые вопросы

| Источник | Вопрос |
| --- | --- |
| entities_from_dictionaries.json | Перformer: отдельный справочник Performer или только User с ролью worker (BUSINESS_LOGIC §6). |
| entities_from_dictionaries.json | ObjectAddress: отдельная таблица или поля в Proposal (BL_PAGES). |
| entities_from_dictionaries.json | Один КП → один или несколько заказов (BUSINESS_LOGIC §6). |
| entities_from_dictionaries.json | Единицы измерения: отдельная сущность Unit или поле у Material/строки (BL_PAGES). |
| entities_from_dictionaries.json | Точный перечень полей Client/User из контракта не дублировал здесь — при синхронизации с кодом дополнить из FRONTEND_CONTRACT. |
| material_geometry_new_model/material_geometry_entities.json | Единицы измерения для geometry фиксируем в мм (height/length/width/diameter/thickness)? |
| material_geometry_new_model/material_geometry_entities.json | Нужна ли отдельная величина/единица для толщины (толщина бывает в зависимости от shapeKey)? |
| material_geometry_new_model/material_geometry_entities.json | Для будущего расчета веса достаточно densityKgM3 + набора geometry-параметров? (или добавится коэффициент/поправка). |
| material_geometry_new_model/material_geometry_entities.json | Цвет материала: достаточно colorName/colorHex в material, или хотим отдельный справочник цветов? |

## Дополнительные JSON-файлы (произвольная структура)

*Пока все `.json` используют только стандартные ключи. Третий файл с новыми корнями появится здесь автоматически.*

