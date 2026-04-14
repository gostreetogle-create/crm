-- CreateTable
CREATE TABLE "OrderItemMaterial" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItemMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItemMaterial_orderId_idx" ON "OrderItemMaterial"("orderId");

-- CreateIndex
CREATE INDEX "OrderItemMaterial_orderId_orderItemId_idx" ON "OrderItemMaterial"("orderId", "orderItemId");

-- AddForeignKey
ALTER TABLE "OrderItemMaterial" ADD CONSTRAINT "OrderItemMaterial_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
