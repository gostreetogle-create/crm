-- AlterEnum
ALTER TYPE "ProductionStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "stockDeducted" BOOLEAN NOT NULL DEFAULT false;
