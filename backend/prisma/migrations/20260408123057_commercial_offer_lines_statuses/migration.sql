-- AlterTable
ALTER TABLE "CommercialOffer" ADD COLUMN     "currentStatusKey" TEXT NOT NULL DEFAULT 'proposal_draft',
ADD COLUMN     "organizationContactId" TEXT,
ADD COLUMN     "recipient" TEXT,
ADD COLUMN     "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vatPercent" DOUBLE PRECISION NOT NULL DEFAULT 22;

-- CreateTable
CREATE TABLE "CommercialOfferLine" (
    "id" TEXT NOT NULL,
    "commercialOfferId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineSum" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "catalogProductId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialOfferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialOfferPrintEvent" (
    "id" TEXT NOT NULL,
    "commercialOfferId" TEXT NOT NULL,
    "printedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,

    CONSTRAINT "CommercialOfferPrintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialOfferLine_commercialOfferId_idx" ON "CommercialOfferLine"("commercialOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialOfferLine_commercialOfferId_lineNo_key" ON "CommercialOfferLine"("commercialOfferId", "lineNo");

-- CreateIndex
CREATE INDEX "CommercialOfferPrintEvent_commercialOfferId_idx" ON "CommercialOfferPrintEvent"("commercialOfferId");

-- CreateIndex
CREATE INDEX "CommercialOfferPrintEvent_printedAt_idx" ON "CommercialOfferPrintEvent"("printedAt");

-- CreateIndex
CREATE INDEX "CommercialOffer_currentStatusKey_idx" ON "CommercialOffer"("currentStatusKey");

-- AddForeignKey
ALTER TABLE "CommercialOffer" ADD CONSTRAINT "CommercialOffer_organizationContactId_fkey" FOREIGN KEY ("organizationContactId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialOfferLine" ADD CONSTRAINT "CommercialOfferLine_commercialOfferId_fkey" FOREIGN KEY ("commercialOfferId") REFERENCES "CommercialOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialOfferPrintEvent" ADD CONSTRAINT "CommercialOfferPrintEvent_commercialOfferId_fkey" FOREIGN KEY ("commercialOfferId") REFERENCES "CommercialOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialOfferPrintEvent" ADD CONSTRAINT "CommercialOfferPrintEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
