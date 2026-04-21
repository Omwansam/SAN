export const DEFAULT_KITCHEN_STATIONS = [
  { id: 'hot', name: 'Hot line' },
  { id: 'cold', name: 'Cold / pantry' },
  { id: 'bar', name: 'Bar' },
]

/**
 * Merge persisted config with defaults so new fields (e.g. kitchen stations) exist.
 * @param {object|null} config
 * @param {string} tenantId
 */
export function withTenantDefaults(config, tenantId) {
  if (!config) return null
  const base = createDefaultTenantConfig(tenantId)
  return {
    ...base,
    ...config,
    tenantId,
    modules: { ...base.modules, ...(config.modules || {}) },
    billing: { ...base.billing, ...(config.billing || {}) },
    receipt: { ...base.receipt, ...(config.receipt || {}) },
    kitchenStations:
      Array.isArray(config.kitchenStations) && config.kitchenStations.length
        ? config.kitchenStations
        : base.kitchenStations,
  }
}

export function createDefaultTenantConfig(tenantId) {
  return {
    tenantId,
    businessName: 'My business',
    businessType: 'retail',
    logo: '',
    primaryColor: '#2563eb',
    currency: { code: 'KES', symbol: 'KSh', position: 'before' },
    taxRate: 0,
    taxLabel: 'VAT',
    receiptFooter: '',
    timezone: 'Africa/Nairobi',
    language: 'en',
    modules: {
      inventory: true,
      tables: false,
      appointments: false,
      prescriptions: false,
      loyalty: false,
      kitchenDisplay: false,
      multiRegister: false,
      deliveries: false,
    },
    paymentMethods: ['cash', 'card', 'mpesa', 'bank_transfer', 'credit'],
    /** Flat delivery fee (same currency as POS); shown in express cart when service = delivery. */
    deliveryFee: 0,
    roles: ['cashier', 'manager', 'admin', 'superadmin'],
    customFields: [],
    kitchenStations: DEFAULT_KITCHEN_STATIONS,
    billing: {
      planName: 'Starter',
      expiresAt: null,
    },
    receipt: {
      logoDataUrl: '',
      footerMessage: '',
      showTax: true,
      showCashier: true,
      showCustomer: true,
    },
  }
}
