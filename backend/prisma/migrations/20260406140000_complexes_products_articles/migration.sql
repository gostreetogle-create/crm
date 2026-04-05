-- Иерархия: complexes → products (товары) → articles (позиции в составе товара).
-- Производственные изделия по-прежнему в таблице "Product" (модель ManufacturedProduct).
-- В этом репозитории legacy-таблицы `items` не было; перенос данных из `items` не выполняется.

-- CreateTable
CREATE TABLE "complexes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "complexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "complex_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "price" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- Check constraints
ALTER TABLE "complexes"
  ADD CONSTRAINT "complexes_name_not_blank" CHECK (length(trim("name")) > 0);

ALTER TABLE "products"
  ADD CONSTRAINT "products_name_not_blank" CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0);

ALTER TABLE "articles"
  ADD CONSTRAINT "articles_name_not_blank" CHECK (length(trim("name")) > 0),
  ADD CONSTRAINT "articles_sort_order_non_negative" CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "articles_qty_positive" CHECK ("qty" > 0);

-- Foreign keys
ALTER TABLE "products"
  ADD CONSTRAINT "products_complex_id_fkey"
  FOREIGN KEY ("complex_id") REFERENCES "complexes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "articles"
  ADD CONSTRAINT "articles_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma @@index
CREATE INDEX "complexes_is_active_name_idx" ON "complexes"("is_active", "name");
CREATE INDEX "products_complex_id_idx" ON "products"("complex_id");
CREATE INDEX "products_complex_id_is_active_name_idx" ON "products"("complex_id", "is_active", "name");
CREATE INDEX "articles_product_id_idx" ON "articles"("product_id");
CREATE INDEX "articles_product_id_is_active_sort_order_name_idx" ON "articles"("product_id", "is_active", "sort_order", "name");

-- Partial unique indexes (непустой code уникален в нужной области)
CREATE UNIQUE INDEX "complexes_code_key" ON "complexes"("code") WHERE "code" IS NOT NULL;
CREATE UNIQUE INDEX "products_complex_id_code_key" ON "products"("complex_id", "code") WHERE "code" IS NOT NULL;
CREATE UNIQUE INDEX "articles_product_id_code_key" ON "articles"("product_id", "code") WHERE "code" IS NOT NULL;

-- Комментарии
COMMENT ON TABLE "complexes" IS 'Коммерческий комплекс: в комплекс входит несколько товаров (products).';
COMMENT ON TABLE "products" IS 'Товар в составе комплекса: в товар входит несколько позиций (articles).';
COMMENT ON TABLE "articles" IS 'Позиция в составе товара (количество, сортировка). Не производственное изделие (см. "Product").';

COMMENT ON COLUMN "products"."price" IS 'Цена товара, DECIMAL(12,2), неотрицательная.';
COMMENT ON COLUMN "articles"."qty" IS 'Целое количество в составе товара, > 0.';
