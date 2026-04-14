-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- AlterTable (historical-safe: on clean shadow DB "Order" may not exist yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Order'
  ) THEN
    ALTER TABLE "Order"
      ADD COLUMN IF NOT EXISTS "productionStart" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerAssignment_orderId_workerId_lineNo_key" ON "WorkerAssignment"("orderId", "workerId", "lineNo");

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Order'
  ) THEN
    ALTER TABLE "WorkerAssignment"
      ADD CONSTRAINT "WorkerAssignment_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "WorkerAssignment" ADD CONSTRAINT "WorkerAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
