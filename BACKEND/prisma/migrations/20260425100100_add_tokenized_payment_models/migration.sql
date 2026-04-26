/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GatewayTransactionStatus" AS ENUM ('pending', 'success', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "storedPaymentMethodId" TEXT,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "StoredPaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "provider" TEXT,
    "tokenRef" TEXT,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "billingAddress" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoredPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "responseCode" TEXT,
    "responseDescription" TEXT,
    "merchantRequestId" TEXT,
    "checkoutRequestId" TEXT,
    "resultCode" TEXT,
    "resultDescription" TEXT,
    "rawCallback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "phoneNumber" TEXT,
    "status" "GatewayTransactionStatus" NOT NULL DEFAULT 'pending',
    "mpesaReceiptNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredPaymentMethod_tenantId_idx" ON "StoredPaymentMethod"("tenantId");

-- CreateIndex
CREATE INDEX "StoredPaymentMethod_userId_idx" ON "StoredPaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "StoredPaymentMethod_tenantId_method_idx" ON "StoredPaymentMethod"("tenantId", "method");

-- CreateIndex
CREATE INDEX "PaymentResponse_tenantId_idx" ON "PaymentResponse"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentResponse_paymentId_idx" ON "PaymentResponse"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentResponse_merchantRequestId_idx" ON "PaymentResponse"("merchantRequestId");

-- CreateIndex
CREATE INDEX "PaymentResponse_checkoutRequestId_idx" ON "PaymentResponse"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayTransaction_transactionRef_key" ON "GatewayTransaction"("transactionRef");

-- CreateIndex
CREATE INDEX "GatewayTransaction_tenantId_idx" ON "GatewayTransaction"("tenantId");

-- CreateIndex
CREATE INDEX "GatewayTransaction_paymentId_idx" ON "GatewayTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "GatewayTransaction_userId_idx" ON "GatewayTransaction"("userId");

-- CreateIndex
CREATE INDEX "GatewayTransaction_status_idx" ON "GatewayTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_storedPaymentMethodId_idx" ON "Payment"("storedPaymentMethodId");

-- CreateIndex
CREATE INDEX "Payment_paymentStatus_idx" ON "Payment"("paymentStatus");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_storedPaymentMethodId_fkey" FOREIGN KEY ("storedPaymentMethodId") REFERENCES "StoredPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredPaymentMethod" ADD CONSTRAINT "StoredPaymentMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredPaymentMethod" ADD CONSTRAINT "StoredPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentResponse" ADD CONSTRAINT "PaymentResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentResponse" ADD CONSTRAINT "PaymentResponse_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayTransaction" ADD CONSTRAINT "GatewayTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayTransaction" ADD CONSTRAINT "GatewayTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayTransaction" ADD CONSTRAINT "GatewayTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
