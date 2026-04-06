-- Нормализованные категории и подкатегории товаров + FK в trade_goods.
-- Перенос из legacy-колонок category / subcategory (TEXT).

CREATE TABLE "trade_good_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_good_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_good_categories_name_key" ON "trade_good_categories"("name");

CREATE TABLE "trade_good_subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_good_subcategories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_good_subcategories_categoryId_name_key" ON "trade_good_subcategories"("categoryId", "name");
CREATE INDEX "trade_good_subcategories_categoryId_idx" ON "trade_good_subcategories"("categoryId");

ALTER TABLE "trade_good_subcategories" ADD CONSTRAINT "trade_good_subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "trade_good_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_goods" ADD COLUMN "category_id" TEXT;
ALTER TABLE "trade_goods" ADD COLUMN "subcategory_id" TEXT;

INSERT INTO "trade_good_categories" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, d.nm, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM(BOTH FROM "category") AS nm
  FROM "trade_goods"
  WHERE "category" IS NOT NULL AND TRIM(BOTH FROM "category") <> ''
) AS d;

INSERT INTO "trade_good_subcategories" ("id", "categoryId", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, tc."id", TRIM(BOTH FROM p.subnm), 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM(BOTH FROM tg."category") AS catnm, TRIM(BOTH FROM tg."subcategory") AS subnm
  FROM "trade_goods" tg
  WHERE tg."subcategory" IS NOT NULL AND TRIM(BOTH FROM tg."subcategory") <> ''
    AND tg."category" IS NOT NULL AND TRIM(BOTH FROM tg."category") <> ''
) AS p
INNER JOIN "trade_good_categories" tc ON tc."name" = p.catnm
WHERE NOT EXISTS (
  SELECT 1 FROM "trade_good_subcategories" ts
  WHERE ts."categoryId" = tc."id" AND ts."name" = TRIM(BOTH FROM p.subnm)
);

UPDATE "trade_goods" tg
SET "category_id" = tc."id"
FROM "trade_good_categories" tc
WHERE tg."category" IS NOT NULL
  AND TRIM(BOTH FROM tg."category") <> ''
  AND tc."name" = TRIM(BOTH FROM tg."category");

UPDATE "trade_goods" tg
SET "subcategory_id" = ts."id"
FROM "trade_good_subcategories" ts
INNER JOIN "trade_good_categories" tc ON ts."categoryId" = tc."id"
WHERE tg."subcategory" IS NOT NULL
  AND TRIM(BOTH FROM tg."subcategory") <> ''
  AND TRIM(BOTH FROM tg."category") <> ''
  AND tc."name" = TRIM(BOTH FROM tg."category")
  AND ts."name" = TRIM(BOTH FROM tg."subcategory");

ALTER TABLE "trade_goods" DROP COLUMN "category";
ALTER TABLE "trade_goods" DROP COLUMN "subcategory";

CREATE INDEX "trade_goods_category_id_idx" ON "trade_goods"("category_id");
CREATE INDEX "trade_goods_subcategory_id_idx" ON "trade_goods"("subcategory_id");

ALTER TABLE "trade_goods" ADD CONSTRAINT "trade_goods_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "trade_good_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_goods" ADD CONSTRAINT "trade_goods_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "trade_good_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
