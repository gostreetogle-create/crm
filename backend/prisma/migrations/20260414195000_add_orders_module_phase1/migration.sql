-- Safe phase 1 migration for existing Order rows.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "number" TEXT;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "Order"
)
UPDATE "Order" o
SET "number" = 'ORD-' || LPAD(CAST(ordered.rn AS TEXT), 6, '0')
FROM ordered
WHERE o."id" = ordered."id"
  AND o."number" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "number" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Order_number_key'
  ) THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_number_key" UNIQUE ("number");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "warehouseProductId" TEXT,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'шт.',
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BomItem" (
  "id" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "warehouseProductId" TEXT,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'шт.',
  CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_warehouseProductId_idx" ON "OrderItem"("warehouseProductId");
CREATE INDEX IF NOT EXISTS "BomItem_orderItemId_idx" ON "BomItem"("orderItemId");
CREATE INDEX IF NOT EXISTS "BomItem_warehouseProductId_idx" ON "BomItem"("warehouseProductId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_warehouseProductId_fkey'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_warehouseProductId_fkey"
      FOREIGN KEY ("warehouseProductId") REFERENCES "warehouse_products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BomItem_orderItemId_fkey'
  ) THEN
    ALTER TABLE "BomItem"
      ADD CONSTRAINT "BomItem_orderItemId_fkey"
      FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BomItem_warehouseProductId_fkey'
  ) THEN
    ALTER TABLE "BomItem"
      ADD CONSTRAINT "BomItem_warehouseProductId_fkey"
      FOREIGN KEY ("warehouseProductId") REFERENCES "warehouse_products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
