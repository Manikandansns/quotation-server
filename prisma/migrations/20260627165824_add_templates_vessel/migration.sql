-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "vesselId" TEXT,
ALTER COLUMN "vessel" DROP NOT NULL;

-- CreateTable
CREATE TABLE "QuotationTemplate" (
    "id" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyRegistration" TEXT,
    "gstNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logoPath" TEXT,
    "signaturePath" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vessel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vessel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotationTemplate_templateCode_key" ON "QuotationTemplate"("templateCode");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationTemplate_templateName_key" ON "QuotationTemplate"("templateName");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationTemplate_companyName_key" ON "QuotationTemplate"("companyName");

-- CreateIndex
CREATE INDEX "QuotationTemplate_isDefault_idx" ON "QuotationTemplate"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Vessel_name_key" ON "Vessel"("name");

-- CreateIndex
CREATE INDEX "Vessel_name_idx" ON "Vessel"("name");

-- CreateIndex
CREATE INDEX "Quotation_vesselId_idx" ON "Quotation"("vesselId");

-- CreateIndex
CREATE INDEX "Quotation_templateId_idx" ON "Quotation"("templateId");

-- CreateIndex
CREATE INDEX "Quotation_vessel_idx" ON "Quotation"("vessel");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuotationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_vesselId_fkey" FOREIGN KEY ("vesselId") REFERENCES "Vessel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
