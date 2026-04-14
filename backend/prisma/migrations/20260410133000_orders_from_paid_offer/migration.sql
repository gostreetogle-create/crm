-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "commercialOfferId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "offerNumber" TEXT NOT NULL,
    "customerLabel" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "linesSnapshot" JSONB NOT NULL,
    "notes" TEXT,
    "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'PENDING',
    "productionStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_commercialOfferId_key" ON "Order"("commercialOfferId");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_commercialOfferId_fkey" FOREIGN KEY ("commercialOfferId") REFERENCES "CommercialOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (historical-safe: ensure WorkerAssignment -> Order exists when Order is created after production module migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'WorkerAssignment'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WorkerAssignment_orderId_fkey'
  ) THEN
    ALTER TABLE "WorkerAssignment"
      ADD CONSTRAINT "WorkerAssignment_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

