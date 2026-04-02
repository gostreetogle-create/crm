-- AlterTable
ALTER TABLE "Material" ADD COLUMN "supplierOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "ProductionDetail" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceMaterialId" TEXT,
    "sourceWorkTypeId" TEXT,
    "snapshotMaterialName" TEXT,
    "snapshotMaterialCode" TEXT,
    "snapshotUnitCode" TEXT,
    "snapshotUnitName" TEXT,
    "snapshotPurchasePriceRub" DOUBLE PRECISION,
    "snapshotDensityKgM3" DOUBLE PRECISION,
    "snapshotHeightMm" DOUBLE PRECISION,
    "snapshotLengthMm" DOUBLE PRECISION,
    "snapshotWidthMm" DOUBLE PRECISION,
    "snapshotDiameterMm" DOUBLE PRECISION,
    "snapshotThicknessMm" DOUBLE PRECISION,
    "snapshotCharacteristicName" TEXT,
    "snapshotWorkTypeName" TEXT,
    "snapshotWorkShortLabel" TEXT,
    "snapshotHourlyRateRub" DOUBLE PRECISION,
    "workTimeHours" DOUBLE PRECISION,
    "materialTotalRub" DOUBLE PRECISION,
    "workTotalRub" DOUBLE PRECISION,
    "lineTotalRub" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionDetail_sourceMaterialId_idx" ON "ProductionDetail"("sourceMaterialId");

-- CreateIndex
CREATE INDEX "ProductionDetail_sourceWorkTypeId_idx" ON "ProductionDetail"("sourceWorkTypeId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_supplierOrganizationId_fkey" FOREIGN KEY ("supplierOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDetail" ADD CONSTRAINT "ProductionDetail_sourceMaterialId_fkey" FOREIGN KEY ("sourceMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDetail" ADD CONSTRAINT "ProductionDetail_sourceWorkTypeId_fkey" FOREIGN KEY ("sourceWorkTypeId") REFERENCES "ProductionWorkType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
