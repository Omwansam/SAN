-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('cashier', 'manager', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "RegisterStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('completed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'pending', 'failed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'mpesa', 'bank_transfer', 'credit');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('queued', 'preparing', 'ready', 'served');

-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('delivery', 'dine_in', 'takeaway');

-- CreateEnum
CREATE TYPE "NotificationLevel" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('none', 'percent', 'flat');

-- CreateEnum
CREATE TYPE "TenantProvisionStatus" AS ENUM ('pending', 'provisioning', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "BillingPlanInterval" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('create_account', 'business_details', 'billing', 'verify_email', 'setting_up', 'completed');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "schemaName" TEXT,
    "provisionStatus" "TenantProvisionStatus" NOT NULL DEFAULT 'ready',
    "provisionError" TEXT,
    "provisionStartedAt" TIMESTAMP(3),
    "provisionCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "logo" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "timezone" TEXT DEFAULT 'Africa/Nairobi',
    "language" TEXT DEFAULT 'en',
    "currencyCode" TEXT DEFAULT 'KES',
    "currencySymbol" TEXT DEFAULT 'KSh',
    "currencyPosition" TEXT DEFAULT 'before',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxLabel" TEXT DEFAULT 'VAT',
    "receiptFooter" TEXT,
    "paymentMethods" JSONB,
    "kitchenStations" JSONB,
    "modules" JSONB,
    "billing" JSONB,
    "receipt" JSONB,
    "roles" JSONB,
    "customFields" JSONB,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "industry" TEXT,
    "businessSize" TEXT,
    "website" TEXT,
    "businessTypeConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "includeSampleData" BOOLEAN NOT NULL DEFAULT true,
    "workspaceInitialized" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "billingPlanInterval" "BillingPlanInterval",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'cashier',
    "pin" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "registerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBranch" (
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBranch_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateTable
CREATE TABLE "Register" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openingFloat" INTEGER NOT NULL DEFAULT 0,
    "currentFloat" INTEGER NOT NULL DEFAULT 0,
    "status" "RegisterStatus" NOT NULL DEFAULT 'open',
    "cashierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT DEFAULT 'ea',
    "variants" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "kitchenStationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" INTEGER NOT NULL DEFAULT 0,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "registerId" TEXT,
    "cashierId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'completed',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'paid',
    "subtotal" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "taxableBase" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "change" INTEGER NOT NULL DEFAULT 0,
    "receiptPrinted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "tipsTotal" INTEGER NOT NULL DEFAULT 0,
    "deliveryFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "serviceMode" "ServiceMode",
    "serviceModeLabel" TEXT,
    "deliveryAddress" TEXT,
    "deliveryPhone" TEXT,
    "deliveryRider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "rxNumber" TEXT,
    "prescriber" TEXT,
    "patientDOB" TEXT,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "deaNumber" TEXT,
    "refillsAuthorized" INTEGER NOT NULL DEFAULT 0,
    "refillsRemaining" INTEGER NOT NULL DEFAULT 0,
    "pickupVerified" BOOLEAN NOT NULL DEFAULT false,
    "pickupIdLast4" TEXT,
    "prescriptionNotes" TEXT,
    "prescriptionImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "productId" TEXT,
    "productName" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispensingLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT,
    "cashierId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispensingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispensingLine" (
    "id" TEXT NOT NULL,
    "dispensingLogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "rxNumber" TEXT,
    "prescriber" TEXT,
    "patientDOB" TEXT,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "deaNumber" TEXT,
    "refillsAuthorized" INTEGER NOT NULL DEFAULT 0,
    "refillsRemaining" INTEGER NOT NULL DEFAULT 0,
    "pickupVerified" BOOLEAN NOT NULL DEFAULT false,
    "pickupIdLast4" TEXT,

    CONSTRAINT "DispensingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "branchId" TEXT,
    "status" TEXT DEFAULT 'preparing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicketItem" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "lineKey" TEXT,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "prepStatus" "PrepStatus" NOT NULL DEFAULT 'queued',
    "stationId" TEXT DEFAULT 'hot',

    CONSTRAINT "KitchenTicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "label" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER,
    "status" TEXT,
    "orderId" TEXT,
    "currentTotal" INTEGER DEFAULT 0,
    "serverName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "backgroundColor" TEXT DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "level" "NotificationLevel" NOT NULL DEFAULT 'info',
    "title" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeldCart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeldCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "tokenHash" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "role" "UserRole",
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRuntimeState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activeBranchId" TEXT,
    "activeRegisterId" TEXT,
    "zReportClosed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRuntimeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftCart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "activeCustomerId" TEXT,
    "serviceMode" "ServiceMode" NOT NULL DEFAULT 'delivery',
    "orderDiscountType" "DiscountType" NOT NULL DEFAULT 'none',
    "orderDiscountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAddress" TEXT,
    "deliveryPhone" TEXT,
    "deliveryRiderName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftCartLine" (
    "id" TEXT NOT NULL,
    "draftCartId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "rxNumber" TEXT,
    "prescriber" TEXT,
    "patientDOB" TEXT,
    "deaNumber" TEXT,
    "refillsAuthorized" INTEGER NOT NULL DEFAULT 0,
    "refillsRemaining" INTEGER NOT NULL DEFAULT 0,
    "pickupVerified" BOOLEAN NOT NULL DEFAULT false,
    "pickupIdLast4" TEXT,
    "kitchenStationId" TEXT,
    "prescriptionNotes" TEXT,
    "prescriptionImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftCartLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slug" TEXT,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLoginAttempt" (
    "id" TEXT NOT NULL,
    "workspaceSlug" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDraft" (
    "id" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'in_progress',
    "currentStep" "OnboardingStep" NOT NULL DEFAULT 'create_account',
    "adminFirstName" TEXT,
    "adminLastName" TEXT,
    "adminEmail" TEXT NOT NULL,
    "phoneCountryIso" TEXT DEFAULT 'KE',
    "adminPhoneLocal" TEXT,
    "adminPhoneFull" TEXT,
    "passwordHash" TEXT,
    "passwordScore" INTEGER,
    "termsAcceptedAt" TIMESTAMP(3),
    "workspaceSlug" TEXT,
    "businessName" TEXT,
    "industry" TEXT,
    "businessSize" TEXT,
    "businessWebsite" TEXT,
    "billingPlanInterval" "BillingPlanInterval",
    "trialEndsAt" TIMESTAMP(3),
    "verificationCodeHash" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "resendAvailableAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "setupProgress" INTEGER DEFAULT 50,
    "setupMessageIndex" INTEGER DEFAULT 0,
    "setupStartedAt" TIMESTAMP(3),
    "setupCompletedAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "createdAdminUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_schemaName_key" ON "Tenant"("schemaName");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_domain_key" ON "TenantDomain"("domain");

-- CreateIndex
CREATE INDEX "TenantDomain_tenantId_idx" ON "TenantDomain"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfig_tenantId_key" ON "TenantConfig"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_phone_idx" ON "User"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "User_registerId_idx" ON "User"("registerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_name_key" ON "Branch"("tenantId", "name");

-- CreateIndex
CREATE INDEX "UserBranch_branchId_idx" ON "UserBranch"("branchId");

-- CreateIndex
CREATE INDEX "Register_tenantId_idx" ON "Register"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Register_tenantId_name_key" ON "Register"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_name_key" ON "Category"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_barcode_key" ON "Product"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE INDEX "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_branchId_idx" ON "Order"("branchId");

-- CreateIndex
CREATE INDEX "Order_registerId_idx" ON "Order"("registerId");

-- CreateIndex
CREATE INDEX "Order_cashierId_idx" ON "Order"("cashierId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "StockLog_tenantId_idx" ON "StockLog"("tenantId");

-- CreateIndex
CREATE INDEX "StockLog_branchId_idx" ON "StockLog"("branchId");

-- CreateIndex
CREATE INDEX "StockLog_productId_idx" ON "StockLog"("productId");

-- CreateIndex
CREATE INDEX "StockLog_userId_idx" ON "StockLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DispensingLog_orderId_key" ON "DispensingLog"("orderId");

-- CreateIndex
CREATE INDEX "DispensingLog_tenantId_idx" ON "DispensingLog"("tenantId");

-- CreateIndex
CREATE INDEX "DispensingLog_cashierId_idx" ON "DispensingLog"("cashierId");

-- CreateIndex
CREATE INDEX "DispensingLog_customerId_idx" ON "DispensingLog"("customerId");

-- CreateIndex
CREATE INDEX "DispensingLine_dispensingLogId_idx" ON "DispensingLine"("dispensingLogId");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTicket_orderId_key" ON "KitchenTicket"("orderId");

-- CreateIndex
CREATE INDEX "KitchenTicket_tenantId_idx" ON "KitchenTicket"("tenantId");

-- CreateIndex
CREATE INDEX "KitchenTicket_branchId_idx" ON "KitchenTicket"("branchId");

-- CreateIndex
CREATE INDEX "KitchenTicketItem_ticketId_idx" ON "KitchenTicketItem"("ticketId");

-- CreateIndex
CREATE INDEX "DiningTable_tenantId_idx" ON "DiningTable"("tenantId");

-- CreateIndex
CREATE INDEX "DiningTable_branchId_idx" ON "DiningTable"("branchId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_idx" ON "Appointment"("tenantId");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_startAt_idx" ON "Appointment"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "HeldCart_tenantId_idx" ON "HeldCart"("tenantId");

-- CreateIndex
CREATE INDEX "HeldCart_branchId_idx" ON "HeldCart"("branchId");

-- CreateIndex
CREATE INDEX "AuthSession_tenantId_idx" ON "AuthSession"("tenantId");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRuntimeState_tenantId_key" ON "TenantRuntimeState"("tenantId");

-- CreateIndex
CREATE INDEX "TenantRuntimeState_activeBranchId_idx" ON "TenantRuntimeState"("activeBranchId");

-- CreateIndex
CREATE INDEX "TenantRuntimeState_activeRegisterId_idx" ON "TenantRuntimeState"("activeRegisterId");

-- CreateIndex
CREATE INDEX "DraftCart_tenantId_idx" ON "DraftCart"("tenantId");

-- CreateIndex
CREATE INDEX "DraftCart_activeCustomerId_idx" ON "DraftCart"("activeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftCart_tenantId_branchId_key" ON "DraftCart"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "DraftCartLine_draftCartId_idx" ON "DraftCartLine"("draftCartId");

-- CreateIndex
CREATE INDEX "DraftCartLine_productId_idx" ON "DraftCartLine"("productId");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_email_idx" ON "EmailVerificationChallenge"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_email_slug_idx" ON "EmailVerificationChallenge"("email", "slug");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_expiresAt_idx" ON "EmailVerificationChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_tenantId_idx" ON "EmailVerificationChallenge"("tenantId");

-- CreateIndex
CREATE INDEX "AuthLoginAttempt_workspaceSlug_createdAt_idx" ON "AuthLoginAttempt"("workspaceSlug", "createdAt");

-- CreateIndex
CREATE INDEX "AuthLoginAttempt_createdAt_idx" ON "AuthLoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "OnboardingDraft_status_currentStep_idx" ON "OnboardingDraft"("status", "currentStep");

-- CreateIndex
CREATE INDEX "OnboardingDraft_adminEmail_idx" ON "OnboardingDraft"("adminEmail");

-- CreateIndex
CREATE INDEX "OnboardingDraft_workspaceSlug_idx" ON "OnboardingDraft"("workspaceSlug");

-- CreateIndex
CREATE INDEX "OnboardingDraft_tenantId_idx" ON "OnboardingDraft"("tenantId");

-- CreateIndex
CREATE INDEX "OnboardingDraft_createdAdminUserId_idx" ON "OnboardingDraft"("createdAdminUserId");

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantConfig" ADD CONSTRAINT "TenantConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "Register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranch" ADD CONSTRAINT "UserBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Register" ADD CONSTRAINT "Register_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "Register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensingLog" ADD CONSTRAINT "DispensingLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensingLog" ADD CONSTRAINT "DispensingLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensingLog" ADD CONSTRAINT "DispensingLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensingLine" ADD CONSTRAINT "DispensingLine_dispensingLogId_fkey" FOREIGN KEY ("dispensingLogId") REFERENCES "DispensingLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket" ADD CONSTRAINT "KitchenTicket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicketItem" ADD CONSTRAINT "KitchenTicketItem_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "KitchenTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeldCart" ADD CONSTRAINT "HeldCart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeldCart" ADD CONSTRAINT "HeldCart_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRuntimeState" ADD CONSTRAINT "TenantRuntimeState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRuntimeState" ADD CONSTRAINT "TenantRuntimeState_activeBranchId_fkey" FOREIGN KEY ("activeBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRuntimeState" ADD CONSTRAINT "TenantRuntimeState_activeRegisterId_fkey" FOREIGN KEY ("activeRegisterId") REFERENCES "Register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCart" ADD CONSTRAINT "DraftCart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCart" ADD CONSTRAINT "DraftCart_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCart" ADD CONSTRAINT "DraftCart_activeCustomerId_fkey" FOREIGN KEY ("activeCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCartLine" ADD CONSTRAINT "DraftCartLine_draftCartId_fkey" FOREIGN KEY ("draftCartId") REFERENCES "DraftCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCartLine" ADD CONSTRAINT "DraftCartLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationChallenge" ADD CONSTRAINT "EmailVerificationChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDraft" ADD CONSTRAINT "OnboardingDraft_createdAdminUserId_fkey" FOREIGN KEY ("createdAdminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
