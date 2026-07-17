-- Desktop offline-first + fingerprint support
-- Order/Shift idempotency keys for offline replay, client sale timestamp,
-- and DigitalPersona fingerprint templates.

ALTER TABLE "Order" ADD COLUMN "clientRef" TEXT;
ALTER TABLE "Order" ADD COLUMN "createdAtClient" TIMESTAMP(3);

ALTER TABLE "Shift" ADD COLUMN "clientRef" TEXT;

CREATE UNIQUE INDEX "Order_tenantId_clientRef_key" ON "Order"("tenantId", "clientRef");
CREATE UNIQUE INDEX "Shift_tenantId_clientRef_key" ON "Shift"("tenantId", "clientRef");

CREATE TABLE "FingerprintTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "finger" INTEGER NOT NULL DEFAULT 0,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FingerprintTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FingerprintTemplate_tenantId_userId_finger_key" ON "FingerprintTemplate"("tenantId", "userId", "finger");
CREATE INDEX "FingerprintTemplate_tenantId_idx" ON "FingerprintTemplate"("tenantId");

ALTER TABLE "FingerprintTemplate" ADD CONSTRAINT "FingerprintTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FingerprintTemplate" ADD CONSTRAINT "FingerprintTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
