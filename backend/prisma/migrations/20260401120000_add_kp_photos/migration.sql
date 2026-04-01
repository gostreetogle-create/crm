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
CREATE INDEX "KpPhoto_organizationId_idx" ON "KpPhoto"("organizationId");

-- AddForeignKey
ALTER TABLE "KpPhoto" ADD CONSTRAINT "KpPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
