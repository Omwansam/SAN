const { prisma } = require('../config/db');

const TENANT_SCOPED_MODELS = new Set([
  'TenantConfig',
  'TenantDomain',
  'User',
  'Branch',
  'Register',
  'Category',
  'Product',
  'Customer',
  'Order',
  'OrderLine',
  'Payment',
  'DraftCart',
  'DraftCartLine',
  'InventoryTx',
  'StockTransfer',
  'StockTransferLine',
  'Supplier',
  'PurchaseOrder',
  'PurchaseOrderLine',
  'Expense',
  'Booking',
  'Table',
  'KitchenTicket',
  'KitchenTicketLine',
  'AuthSession',
  'OnboardingDraft',
  'EmailVerificationChallenge',
  'AuthLoginAttempt',
  'TenantRuntimeState',
  'TaxPayerProfile',
  'EtimsConfig',
  'KraDevice',
  'FiscalDocument',
  'FiscalDocumentLine',
  'FiscalSyncJob',
]);

function tenantError(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function withTenantWhere(where, tenantId) {
  if (!where) return { tenantId };
  if (where.tenantId === undefined) return { AND: [where, { tenantId }] };
  if (where.tenantId !== tenantId) {
    throw tenantError('Cross-tenant query blocked by tenant DB context.');
  }
  return where;
}

function withTenantData(data, tenantId) {
  if (!data || typeof data !== 'object') return data;
  if (data.tenantId === undefined || data.tenantId === null) {
    return { ...data, tenantId };
  }
  if (data.tenantId !== tenantId) {
    throw tenantError('Cross-tenant write blocked by tenant DB context.');
  }
  return data;
}

function createTenantScopedDb(tenantId) {
  if (!tenantId) return prisma;
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const nextArgs = { ...(args || {}) };
          switch (operation) {
            case 'findMany':
            case 'findFirst':
            case 'count':
            case 'aggregate':
            case 'groupBy':
            case 'updateMany':
            case 'deleteMany':
              nextArgs.where = withTenantWhere(nextArgs.where, tenantId);
              break;
            case 'create':
              nextArgs.data = withTenantData(nextArgs.data, tenantId);
              break;
            case 'createMany':
              if (Array.isArray(nextArgs.data)) {
                nextArgs.data = nextArgs.data.map((row) => withTenantData(row, tenantId));
              } else if (nextArgs.data) {
                nextArgs.data = withTenantData(nextArgs.data, tenantId);
              }
              break;
            case 'upsert':
              nextArgs.create = withTenantData(nextArgs.create, tenantId);
              nextArgs.update = withTenantData(nextArgs.update, tenantId);
              break;
            case 'findUnique':
            case 'update':
            case 'delete':
              if (nextArgs.where?.tenantId !== undefined && nextArgs.where.tenantId !== tenantId) {
                throw tenantError('Cross-tenant unique lookup blocked by tenant DB context.');
              }
              break;
            default:
              break;
          }

          return query(nextArgs);
        },
      },
    },
  });
}

function tenantDbContext(req, res, next) {
  req.db = createTenantScopedDb(req.tenant?.id || null);
  req.tenantWhere = (extra = {}) => {
    if (!req.tenant?.id) return extra;
    return { tenantId: req.tenant.id, ...extra };
  };
  next();
}

module.exports = tenantDbContext;

