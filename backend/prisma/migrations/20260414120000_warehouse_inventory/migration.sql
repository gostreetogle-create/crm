-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INCOMING', 'OUTGOING', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "warehouse_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "min_stock_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplier_name" TEXT,
    "warehouse_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_stock_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_products_sku_key" ON "warehouse_products"("sku");

-- CreateIndex
CREATE INDEX "warehouse_products_category_idx" ON "warehouse_products"("category");

-- CreateIndex
CREATE INDEX "warehouse_products_quantity_min_stock_level_idx" ON "warehouse_products"("quantity", "min_stock_level");

-- CreateIndex
CREATE INDEX "warehouse_stock_movements_product_id_created_at_idx" ON "warehouse_stock_movements"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "warehouse_stock_movements" ADD CONSTRAINT "warehouse_stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "warehouse_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
