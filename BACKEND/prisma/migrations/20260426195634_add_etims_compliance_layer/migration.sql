-- CreateEnum
CREATE TYPE "EtimsEnvironment" AS ENUM ('sandbox', 'production');

-- CreateEnum
CREATE TYPE "FiscalDocumentType" AS ENUM ('invoice', 'credit_note', 'debit_note');

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('pending', 'queued', 'submitted', 'accepted', 'rejected', 'failed');

-- CreateEnum
CREATE TYPE "FiscalSyncJobStatus" AS ENUM ('pending', 'processing', 'retrying', 'completed', 'failed', 'dead_letter');

-- CreateTable
CREATE TABLE "TaxPayerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kraPin" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT true,
    "vatObligation" TEXT,
    "taxOffice" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxPayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtimsConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "environment" "EtimsEnvironment" NOT NULL DEFAULT 'sandbox',
    "endpointBaseUrl" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "clientId" TEXT,
    "certSerial" TEXT,
    "certFingerprint" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "readinessMode" BOOLEAN NOT NULL DEFAULT true,
    "strictMode" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtimsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KraDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "deviceSerial" TEXT NOT NULL,
    "controlUnitId" TEXT,
    "osVersion" TEXT,
    "firmwareVersion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KraDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "orderId" TEXT,
    "docType" "FiscalDocumentType" NOT NULL,
    "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'pending',
    "payloadHash" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "kraInvoiceNumber" TEXT,
    "acknowledgementCode" TEXT,
    "acknowledgementAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocumentLine" (
    "id" TEXT NOT NULL,
    "fiscalDocumentId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" TEXT,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineDiscount" INTEGER NOT NULL DEFAULT 0,
    "lineTax" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION,
    "taxLabel" TEXT,
    "rawLinePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalSyncJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalDocumentId" TEXT NOT NULL,
    "status" "FiscalSyncJobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "nextRetryAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lockToken" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxPayerProfile_tenantId_key" ON "TaxPayerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "TaxPayerProfile_tenantId_idx" ON "TaxPayerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "EtimsConfig_tenantId_idx" ON "EtimsConfig"("tenantId");

-- CreateIndex
CREATE INDEX "EtimsConfig_branchId_idx" ON "EtimsConfig"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "EtimsConfig_tenantId_branchId_key" ON "EtimsConfig"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "KraDevice_tenantId_idx" ON "KraDevice"("tenantId");

-- CreateIndex
CREATE INDEX "KraDevice_branchId_idx" ON "KraDevice"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "KraDevice_tenantId_deviceSerial_key" ON "KraDevice"("tenantId", "deviceSerial");

-- CreateIndex
CREATE INDEX "FiscalDocument_tenantId_status_idx" ON "FiscalDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FiscalDocument_tenantId_docType_idx" ON "FiscalDocument"("tenantId", "docType");

-- CreateIndex
CREATE INDEX "FiscalDocument_orderId_idx" ON "FiscalDocument"("orderId");

-- CreateIndex
CREATE INDEX "FiscalDocument_branchId_idx" ON "FiscalDocument"("branchId");

-- CreateIndex
CREATE INDEX "FiscalDocumentLine_fiscalDocumentId_idx" ON "FiscalDocumentLine"("fiscalDocumentId");

-- CreateIndex
CREATE INDEX "FiscalSyncJob_tenantId_status_idx" ON "FiscalSyncJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FiscalSyncJob_fiscalDocumentId_idx" ON "FiscalSyncJob"("fiscalDocumentId");

-- CreateIndex
CREATE INDEX "FiscalSyncJob_nextRetryAt_idx" ON "FiscalSyncJob"("nextRetryAt");

-- AddForeignKey
ALTER TABLE "TaxPayerProfile" ADD CONSTRAINT "TaxPayerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtimsConfig" ADD CONSTRAINT "EtimsConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtimsConfig" ADD CONSTRAINT "EtimsConfig_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraDevice" ADD CONSTRAINT "KraDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraDevice" ADD CONSTRAINT "KraDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocumentLine" ADD CONSTRAINT "FiscalDocumentLine_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "FiscalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalSyncJob" ADD CONSTRAINT "FiscalSyncJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalSyncJob" ADD CONSTRAINT "FiscalSyncJob_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "FiscalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
