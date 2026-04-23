# Prisma Schema Reference

This document explains all enums and tables in `schema.prisma` for the multi-tenant POS backend.

## Notes

- IDs are `String` with `cuid()` unless stated otherwise.
- Monetary fields (`price`, `total`, etc.) are integers (typically smallest currency unit).
- Most tables are tenant-scoped through `tenantId`.
- `onDelete: Cascade` means child rows are removed when parent is deleted.
- `onDelete: SetNull` means FK field is nulled when parent is deleted.

## Enums

### `TenantStatus`
- `active`: tenant can operate normally.
- `suspended`: tenant is disabled.

### `UserRole`
- `cashier`, `manager`, `admin`, `superadmin`: permission tiers for users.

### `RegisterStatus`
- `open`, `closed`: till/register state.

### `OrderStatus`
- `completed`, `refunded`, `cancelled`: final order outcome.

### `PaymentStatus`
- `paid`, `pending`, `failed`: payment settlement state.

### `PaymentMethod`
- `cash`, `card`, `mpesa`, `bank_transfer`, `credit`: tender types.

### `PrepStatus`
- `queued`, `preparing`, `ready`, `served`: kitchen prep lifecycle.

### `ServiceMode`
- `delivery`, `dine_in`, `takeaway`: order fulfillment mode.

### `NotificationLevel`
- `info`, `success`, `warning`, `error`: notification severity.

### `DiscountType`
- `none`, `percent`, `flat`: order discount style.

### `TenantProvisionStatus`
- `pending`, `provisioning`, `ready`, `failed`: workspace provisioning lifecycle.

### `BillingPlanInterval`
- `monthly`, `annual`: billing cadence selected during onboarding.

### `OnboardingStep`
- `create_account`, `business_details`, `billing`, `verify_email`, `setting_up`, `completed`.

### `OnboardingStatus`
- `in_progress`, `completed`, `abandoned`.

## Tables (Prisma Models)

## 1) Tenancy Core

### `Tenant`
Primary workspace/business record.

**Key fields**
- `slug` (unique): workspace URL identifier.
- `businessName`, `businessType`: business identity.
- `status`: `TenantStatus`.
- `schemaName` (unique nullable): dedicated DB schema name if used.
- Provisioning fields: `provisionStatus`, `provisionError`, `provisionStartedAt`, `provisionCompletedAt`.
- Timestamps: `createdAt`, `updatedAt`.

**Relationships**
- Parent of most tenant-scoped records: users, branches, orders, products, config, sessions, onboarding data, etc.

### `TenantDomain`
Maps custom domains to tenants.

**Key fields**
- `domain` (unique): mapped hostname.
- `isPrimary`: primary domain flag.

**Relationships**
- Many domains to one tenant (`tenantId` indexed, cascade on tenant delete).

### `TenantConfig`
One-to-one tenant settings and feature configuration.

**Key fields**
- `tenantId` (unique): enforces one config per tenant.
- Branding/localization: `logo`, `primaryColor`, `timezone`, `language`, `currencyCode`, `currencySymbol`.
- Tax/receipt: `taxRate`, `taxLabel`, `receiptFooter`.
- Config blobs: `paymentMethods`, `kitchenStations`, `modules`, `billing`, `receipt`, `roles`, `customFields`.
- Onboarding/business metadata: `industry`, `businessSize`, `website`.
- Flow flags: `businessTypeConfirmed`, `includeSampleData`, `workspaceInitialized`.
- Compliance/verifications: `termsAcceptedAt`, `emailVerifiedAt`.
- Billing: `billingPlanInterval`.

**Relationships**
- One config belongs to one tenant.

## 2) Users and Access

### `User`
Tenant staff/admin account with authentication details.

**Key fields**
- Identity: `name`, optional `firstName`, `lastName`.
- Login: `email`, optional `phone`, `passwordHash`, optional `pin`.
- Access: `role` (`UserRole`), `active`, `lastLogin`.
- Optional POS assignment: `registerId`.

**Constraints**
- Unique per tenant by `@@unique([tenantId, email])`.

**Relationships**
- Belongs to tenant.
- Optional relation to `Register`.
- Many-to-many branch access via `UserBranch`.
- Optional cashier on `Order` records.
- Has many `AuthSession`, `StockLog`, and onboarding draft links.

### `Branch`
Business outlet/location under a tenant.

**Key fields**
- `name` (unique per tenant), optional `address`.

**Relationships**
- Belongs to tenant.
- Connected to users via `UserBranch`.
- Referenced by orders, stock logs, kitchen tickets, dining tables, held carts, draft carts, runtime state.

### `UserBranch`
Join table for user-to-branch permissions.

**Key fields**
- Composite primary key `@@id([userId, branchId])`.

**Relationships**
- Many-to-one to `User`.
- Many-to-one to `Branch`.

### `Register`
POS till/register configuration and current float.

**Key fields**
- `name` (unique per tenant).
- Float and state: `openingFloat`, `currentFloat`, `status`.
- `cashierId` exists as optional metadata.

**Relationships**
- Belongs to tenant.
- Related to users and orders.
- Referenced by tenant runtime state.

## 3) Catalog

### `Category`
Product grouping per tenant.

**Key fields**
- `name` (unique per tenant), optional `color`, `icon`, `sortOrder`.

**Relationships**
- Belongs to tenant.
- One category has many products.

### `Product`
Sellable inventory item.

**Key fields**
- Catalog: `name`, `description`, optional `sku`, `barcode`.
- Pricing/stock: `price`, optional `costPrice`, `stock`, `lowStockAlert`, `unit`.
- Flags: `taxable`, `active`, `controlled`.
- Extras: `variants` (JSON), optional `kitchenStationId`.

**Constraints**
- Unique `sku` per tenant.
- Unique `barcode` per tenant.

**Relationships**
- Belongs to tenant.
- Optional category.
- Referenced by order items, stock logs, and draft cart lines.

## 4) Customers and Orders

### `Customer`
Customer profile and loyalty summary.

**Key fields**
- Contact: `name`, optional `phone`, `email`.
- Analytics: `loyaltyPoints`, `totalSpend`.
- `tags` (JSON) for segmentation.

**Relationships**
- Belongs to tenant.
- Linked to orders, appointments, dispensing logs, and active draft carts.

### `Order`
Sales transaction header.

**Key fields**
- Optional scope links: `branchId`, `registerId`, `cashierId`, `customerId`.
- Snapshot customer field: `customerName`.
- State: `status`, `paymentStatus`, `receiptPrinted`, `partial`.
- Totals: `subtotal`, `taxAmount`, `discountAmount`, `taxableBase`, `total`, `change`, `tipsTotal`, `deliveryFeeAmount`.
- Service/delivery: `serviceMode`, `serviceModeLabel`, `deliveryAddress`, `deliveryPhone`, `deliveryRider`.

**Relationships**
- Belongs to tenant.
- Optionally belongs to branch/register/cashier/customer.
- Has many `OrderItem` and `Payment`.
- Optional 1:1 links to `KitchenTicket` and `DispensingLog`.

### `OrderItem`
Line-level item for an order.

**Key fields**
- Commercial: `name`, `qty`, `unitPrice`, `discount`, `discountPercent`, `tax`, `total`.
- Optional product link: `productId`.
- Pharmacy/controlled fields: `rxNumber`, `prescriber`, `patientDOB`, `controlled`, `deaNumber`, refill fields, pickup verification, notes/image.

**Relationships**
- Belongs to one order (cascade).
- Optional relation to product.

### `Payment`
Payment entry for an order (supports split tenders).

**Key fields**
- `method` (`PaymentMethod`), `amount`, optional `reference`.

**Relationships**
- Belongs to one order (cascade).

## 5) Operational Logs

### `StockLog`
Audit log for stock changes.

**Key fields**
- `delta`: inventory movement (+/-).
- `reason`: explanation of change.
- Optional denormalized `productName`.

**Relationships**
- Belongs to tenant.
- Optional branch, product, and user references.

### `DispensingLog`
Pharmacy dispensing session/audit header.

**Key fields**
- Optional `orderId` with unique constraint (max one dispensing log per order).
- Optional `cashierId`, `customerId`.

**Relationships**
- Belongs to tenant.
- Optional relation to order and customer.
- Has many `DispensingLine`.

### `DispensingLine`
Dispensed line items under a dispensing log.

**Key fields**
- `name`, `qty`.
- Prescription/control fields similar to order line controlled medication metadata.

**Relationships**
- Belongs to one `DispensingLog` (cascade).

## 6) Kitchen, Floor, Scheduling

### `KitchenTicket`
Kitchen workflow ticket derived from an order.

**Key fields**
- `orderId` unique (one ticket per order).
- Optional `branchId`.
- `status` string with default `"preparing"`.

**Relationships**
- Belongs to tenant.
- Belongs to one order.
- Has many `KitchenTicketItem`.

### `KitchenTicketItem`
Kitchen-prep line under a ticket.

**Key fields**
- Snapshot commercial fields: `name`, `qty`, `unitPrice`, `discount`, `tax`, `total`.
- `prepStatus` (`PrepStatus`), optional `stationId`.

**Relationships**
- Belongs to one kitchen ticket.

### `DiningTable`
Floor layout and occupancy state for dine-in.

**Key fields**
- Layout: `label`, `x`, `y`, optional `capacity`.
- Runtime status: `status`, `orderId`, `currentTotal`, `serverName`.

**Relationships**
- Belongs to tenant.
- Optional branch.

### `Appointment`
Calendar booking entry.

**Key fields**
- `title`, `startAt`, `endAt`, optional `backgroundColor`.

**Relationships**
- Belongs to tenant.
- Optional relation to customer.

## 7) Runtime, Sessions, Carts

### `Notification`
Tenant-scoped notification stream.

**Key fields**
- `level` (`NotificationLevel`), optional `title`, `message`.

**Relationships**
- Belongs to tenant.

### `HeldCart`
Serialized parked cart snapshot.

**Key fields**
- `snapshot` (JSON) for recoverable cart state.

**Relationships**
- Belongs to tenant.
- Optional branch.

### `AuthSession`
Session/token lifecycle tracking.

**Key fields**
- Optional `tokenHash`.
- Snapshot fields: `userName`, `userEmail`, `role`.
- Timing fields: `issuedAt`, `expiresAt`, `revokedAt`.

**Relationships**
- Belongs to tenant.
- Optional relation to user.

### `TenantRuntimeState`
Current operational context for a tenant (single row per tenant).

**Key fields**
- `tenantId` unique.
- `activeBranchId`, `activeRegisterId`, `zReportClosed`.

**Relationships**
- Belongs to tenant.
- Optional branch/register pointers.

### `DraftCart`
Editable in-progress cart per tenant+branch.

**Key fields**
- `serviceMode`, order discount fields, delivery fields, optional active customer.

**Constraints**
- `@@unique([tenantId, branchId])` (one active draft cart per branch per tenant).

**Relationships**
- Belongs to tenant.
- Belongs to branch.
- Optional active customer.
- Has many draft lines.

### `DraftCartLine`
Editable line in a draft cart.

**Key fields**
- Basic fields: `name`, `qty`, `unitPrice`, discounts, note.
- Optional product link.
- Controlled/Rx metadata and kitchen station.

**Relationships**
- Belongs to one draft cart.
- Optional relation to product.

## 8) Onboarding and Auth Support

### `EmailVerificationChallenge`
Server-side OTP challenge storage for onboarding/email verification.

**Key fields**
- `email`, optional `slug`.
- `codeHash` (never plain OTP), `expiresAt`, `consumedAt`, `attemptCount`.
- Optional `tenantId` link.

**Relationships**
- Optional relation to tenant.

### `AuthLoginAttempt`
Optional login attempt audit trail.

**Key fields**
- `workspaceSlug`, `identifier`, `method`, `success`.
- Optional request metadata: `ipAddress`, `userAgent`.

**Relationships**
- Standalone audit table (no FK relations in schema).

### `OnboardingDraft`
Persistent 5-step onboarding state machine snapshot.

**Key fields**
- Workflow state: `status`, `currentStep`.
- Step 0 account fields: names, email/phone, password metadata, terms acceptance.
- Step 1 business fields: slug, business identity info.
- Step 2 billing fields: `billingPlanInterval`, `trialEndsAt`.
- Step 3 verification fields: code hash, sent/resend state, verification timestamp.
- Step 4 setup/progress fields.
- Completion linkage: optional `tenantId`, optional `createdAdminUserId`, completion/abandon timestamps.

**Relationships**
- Optional relation to tenant.
- Optional relation to created admin user.

## High-Impact Constraints Summary

- One-to-one:
  - `Tenant` -> `TenantConfig` via unique `tenantId`.
  - `Tenant` -> `TenantRuntimeState` via unique `tenantId`.
  - `Order` -> `KitchenTicket` via unique `orderId` in `KitchenTicket`.
  - `Order` -> `DispensingLog` via unique `orderId` in `DispensingLog`.
- Per-tenant uniqueness:
  - `User` email, `Branch` name, `Register` name, `Category` name, `Product` sku/barcode.
- Join-table key:
  - `UserBranch` composite PK (`userId`, `branchId`).
- Cart scoping:
  - `DraftCart` unique (`tenantId`, `branchId`).

