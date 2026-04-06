-- Категория / подкатегория для витрины КП и единица измерения позиции.
ALTER TABLE "trade_goods" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "trade_goods" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
ALTER TABLE "trade_goods" ADD COLUMN IF NOT EXISTS "unit_code" TEXT;
