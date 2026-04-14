-- CreateEnum
CREATE TYPE "SupplyRequestStatus" AS ENUM ('OPEN', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplyItemStatus" AS ENUM ('PENDING', 'PARTIAL', 'RECEIVED');

-- CreateTable
CREATE TABLE "SupplyRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "SupplyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyRequestItem" (
    "id" TEXT NOT NULL,
    "supplyRequestId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "warehouseProductId" TEXT,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SupplyItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplyRequest_orderId_key" ON "SupplyRequest"("orderId");

-- CreateIndex
CREATE INDEX "SupplyRequestItem_supplyRequestId_idx" ON "SupplyRequestItem"("supplyRequestId");

-- CreateIndex
CREATE INDEX "SupplyRequestItem_warehouseProductId_idx" ON "SupplyRequestItem"("warehouseProductId");

-- CreateIndex
CREATE INDEX "SupplyRequestItem_sku_idx" ON "SupplyRequestItem"("sku");

-- AddForeignKey
ALTER TABLE "SupplyRequest" ADD CONSTRAINT "SupplyRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyRequestItem" ADD CONSTRAINT "SupplyRequestItem_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "SupplyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
