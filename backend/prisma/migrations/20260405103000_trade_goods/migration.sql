-- CreateTable
CREATE TABLE "trade_goods" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceRub" DOUBLE PRECISION,
    "costRub" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_good_lines" (
    "id" TEXT NOT NULL,
    "tradeGoodId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_good_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trade_goods_code_key" ON "trade_goods"("code");

-- CreateIndex
CREATE INDEX "trade_good_lines_tradeGoodId_idx" ON "trade_good_lines"("tradeGoodId");

-- CreateIndex
CREATE INDEX "trade_good_lines_productId_idx" ON "trade_good_lines"("productId");

-- AddForeignKey
ALTER TABLE "trade_good_lines" ADD CONSTRAINT "trade_good_lines_tradeGoodId_fkey" FOREIGN KEY ("tradeGoodId") REFERENCES "trade_goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_good_lines" ADD CONSTRAINT "trade_good_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
