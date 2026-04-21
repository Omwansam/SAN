/**
 * Pre-built workspaces to showcase POS for each business / module profile.
 * Each gets a full product catalogue via `seedTenant(slug, businessType)`.
 */
export const UNIFIED_POS_LOGIN = {
  adminEmail: 'admin@pos.demo',
  cashierEmail: 'cashier@pos.demo',
  password: 'demo123',
  adminPin: '1234',
  cashierPin: '4321',
}

/** Legacy slug `demo` may still have admin@demo.com in older local data. */
export const LEGACY_DEMO_LOGIN = {
  adminEmail: 'admin@demo.com',
  cashierEmail: 'cashier@demo.com',
  password: 'demo123',
  adminPin: '1234',
  cashierPin: '4321',
}

const baseModules = {
  inventory: true,
  tables: false,
  appointments: false,
  prescriptions: false,
  loyalty: false,
  kitchenDisplay: false,
  multiRegister: true,
  deliveries: false,
}

export const DEMO_CATEGORY_PRESETS = [
  {
    slug: 'demo-retail',
    label: 'General retail',
    subtitle: '12 SKUs · apparel, electronics, groceries',
    businessType: 'retail',
    businessName: 'Demo Retail Market',
    modules: { ...baseModules, inventory: true },
  },
  {
    slug: 'demo-pharmacy',
    label: 'Pharmacy',
    subtitle: '12 SKUs · OTC, Rx, wellness + compliance',
    businessType: 'pharmacy',
    businessName: 'Demo Community Pharmacy',
    modules: {
      ...baseModules,
      prescriptions: true,
      tables: true,
      appointments: true,
      kitchenDisplay: true,
      loyalty: true,
    },
  },
  {
    slug: 'demo-restaurant',
    label: 'Restaurant',
    subtitle: '12 SKUs · mains, sides, drinks + KDS',
    businessType: 'restaurant',
    businessName: 'Demo Restaurant & Bar',
    deliveryFee: 150,
    modules: {
      ...baseModules,
      tables: true,
      kitchenDisplay: true,
      loyalty: true,
    },
  },
  {
    slug: 'demo-salon',
    label: 'Salon / spa',
    subtitle: '12 SKUs · hair, nails, spa + bookings',
    businessType: 'salon',
    businessName: 'Demo Salon & Spa',
    modules: {
      ...baseModules,
      appointments: true,
      loyalty: true,
    },
  },
  {
    slug: 'demo-laundry',
    label: 'Laundry point',
    subtitle: '12 SKUs · wash & fold, dry clean, extras',
    businessType: 'laundry',
    businessName: 'Demo FreshFold Laundry',
    modules: {
      ...baseModules,
      inventory: true,
      loyalty: true,
      appointments: true,
    },
  },
  {
    slug: 'demo-liquor',
    label: 'Liquor store',
    subtitle: '12 SKUs · spirits, wine, beer & mixers',
    businessType: 'liquor',
    businessName: 'Demo Cellar & Spirits',
    modules: { ...baseModules, inventory: true, loyalty: true },
  },
]

/** Original all-in-one slug (pharmacy-heavy); same catalogue as demo-pharmacy. */
export const LEGACY_HUB_SLUG = 'demo'

/** True for built-in category demo slugs (unified staff + PINs). */
export function isCategoryDemoTenantId(tenantId) {
  const t = String(tenantId ?? '').trim().toLowerCase()
  if (!t) return false
  if (t === LEGACY_HUB_SLUG) return true
  return DEMO_CATEGORY_PRESETS.some((p) => p.slug === t)
}
