-- CreateEnum
CREATE TYPE "CommercialOfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "legalForm" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "okpo" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "legalAddress" TEXT,
    "postalAddress" TEXT,
    "bankName" TEXT,
    "bankBik" TEXT,
    "bankAccount" TEXT,
    "bankCorrAccount" TEXT,
    "signerName" TEXT,
    "signerPosition" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialOffer" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "title" TEXT,
    "status" "CommercialOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationId" TEXT,
    "clientId" TEXT,
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationContact" (
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationContact_pkey" PRIMARY KEY ("organizationId","clientId")
);

-- CreateTable
CREATE TABLE "KpPhoto" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "photoTitle" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialOffer_organizationId_idx" ON "CommercialOffer"("organizationId");

-- CreateIndex
CREATE INDEX "CommercialOffer_clientId_idx" ON "CommercialOffer"("clientId");

-- CreateIndex
CREATE INDEX "CommercialOffer_status_idx" ON "CommercialOffer"("status");

-- CreateIndex
CREATE INDEX "CommercialOffer_createdAt_idx" ON "CommercialOffer"("createdAt");

-- CreateIndex
CREATE INDEX "OrganizationContact_clientId_idx" ON "OrganizationContact"("clientId");

-- CreateIndex
CREATE INDEX "KpPhoto_organizationId_idx" ON "KpPhoto"("organizationId");

-- AddForeignKey
ALTER TABLE "CommercialOffer" ADD CONSTRAINT "CommercialOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialOffer" ADD CONSTRAINT "CommercialOffer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationContact" ADD CONSTRAINT "OrganizationContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationContact" ADD CONSTRAINT "OrganizationContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpPhoto" ADD CONSTRAINT "KpPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
