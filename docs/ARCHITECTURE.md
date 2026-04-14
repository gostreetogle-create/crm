# CRM Architecture (actual implementation)

Документ фиксирует текущую реализованную бизнес-логику по коду backend/frontend.

## 1) Модули системы

### 1.1 Производство (`production-feature`)

- Канбан-доска заказов реализована на фронте в `crm-web/libs/production-feature`.
- Статусы заказа (state machine): `PENDING -> IN_PROGRESS -> DONE -> SHIPPED`.
- Обычная смена статуса проверяется на допустимость перехода.
- Принудительная смена статуса (`force`) требует права `production.force_status`.
- Drag-and-drop на доске блокирует недопустимые переходы (и на клиенте, и на API).
- Кнопка "Отгрузить" доступна только для заказа в статусе `DONE`.
- Отгрузка выполняется атомарно: переход в `SHIPPED` + создание `OUTGOING` движений склада.
- Идемпотентность отгрузки обеспечивается полем `Order.stockDeducted`: повторное списание блокируется.

### 1.2 Склад (`warehouse-feature`)

- Реализован CRUD складских товаров: `sku`, `name`, `category`, `unit`, `price`, `minStockLevel`.
- Типы движений: `INCOMING`, `OUTGOING`, `ADJUSTMENT`.
- Сводка остатков: `GET /api/warehouse/summary` (`totalProducts`, `lowStockCount`, `totalValue`).
- При отгрузке заказа автоматически создаются `OUTGOING` движения.
- Текущее поведение: `ADJUSTMENT` пока не имеет отдельной отрицательной ветки и обрабатывается по входящему сценарию.

### 1.3 Снабжение (`supply-feature`)

- `SupplyRequest` создается автоматически после оплаты КП (перехода КП в `proposal_paid`).
- Страница "Снабжение" на фронте: список заявок и детальный просмотр.
- Действие "Поступило": менеджер вводит фактическое количество, backend вызывает `applyIncoming`, на складе создается `INCOMING` движение.
- Статусы заявки в коде: `OPEN -> PARTIAL -> RECEIVED` (дополнительно есть `CANCELLED` в enum).
- Для бизнес-терминов в документации применяется маппинг:
  - `PENDING` (бизнес) = `OPEN` (код),
  - `PARTIALLY_RECEIVED` (бизнес) = `PARTIAL` (код),
  - `RECEIVED` (бизнес) = `RECEIVED` (код).

### 1.4 Коммерческое предложение (КП)

- Заказ запускается в производственный контур только после оплаты КП.
- Оплата КП запускает автопроцесс:
  1) создание заказа (если еще нет),
  2) автосоздание `SupplyRequest` по позициям.

## 2) Права доступа

- Ключ `production.force_status` определен в каноне permission keys.
- Роль `admin` (код роли) и системная роль (`isSystem`) получают полный набор прав.

## 3) Стек

- Frontend: Angular 17+ (фактически Angular 21), Nx monorepo, signals, CDK DragDrop.
- Backend: Express 5, Prisma ORM, PostgreSQL.
- Валидация: Zod (backend schemas/контракты).
- UI: `@srm/ui-kit`, базовая оболочка страниц через `PageShellComponent`.

## 4) Источники реализации (ключевые файлы)

- Backend:
  - `backend/src/routes/production.routes.ts`
  - `backend/src/routes/warehouse.routes.ts`
  - `backend/src/routes/supply.routes.ts`
  - `backend/src/services/warehouse/stock-movement.service.ts`
  - `backend/src/services/commercial-offers/change-offer-status.service.ts`
  - `backend/src/services/commercial-offers/create-order-from-paid-offer.service.ts`
  - `backend/src/lib/authz-permission-keys.ts`
  - `backend/src/lib/authz-effective-keys.ts`
  - `backend/prisma/schema.prisma`
- Frontend:
  - `crm-web/libs/production-feature/**`
  - `crm-web/libs/warehouse-feature/**`
  - `crm-web/libs/supply-feature/**`
  - `crm-web/libs/ui-kit/**`
  - `crm-web/src/app/app.routes.ts`
