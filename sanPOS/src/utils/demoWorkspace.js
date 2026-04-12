import { hashPassword } from './password'
import { getJSON, setJSON } from './storage'
import { seedTenant } from './seedTenant'
import { createDefaultTenantConfig } from './tenantDefaults'
import { registerTenantInGlobalList } from './tenantRegistry'
import { newId } from './uuid'
import {
  DEMO_CATEGORY_PRESETS,
  LEGACY_HUB_SLUG,
  UNIFIED_POS_LOGIN,
} from '../constants/demoCategoryWorkspaces'
import { ensureUnifiedDemoStaff } from './ensureUnifiedDemoStaff'

const bySlug = Object.fromEntries(
  DEMO_CATEGORY_PRESETS.map((p) => [p.slug, p]),
)

const pharmacyModules = DEMO_CATEGORY_PRESETS.find((p) => p.slug === 'demo-pharmacy')
  ?.modules

bySlug[LEGACY_HUB_SLUG] = {
  slug: LEGACY_HUB_SLUG,
  label: 'All-in-one hub',
  subtitle: 'Same as pharmacy preset · legacy slug',
  businessType: 'pharmacy',
  businessName: 'Demo Pharmacy & Retail',
  modules: pharmacyModules ?? {
    inventory: true,
    prescriptions: true,
    tables: true,
    appointments: true,
    kitchenDisplay: true,
    loyalty: true,
    multiRegister: true,
    deliveries: false,
  },
}

/**
 * Creates workspace config, unified demo users, and seeded catalogue (always includes products).
 * @param {string} slug e.g. demo-retail, demo-pharmacy, demo
 */
export async function ensureCategoryDemoWorkspace(slug) {
  const tid = String(slug).trim().toLowerCase()
  const preset = bySlug[tid]
  if (!preset) {
    throw new Error(`Unknown demo workspace: ${slug}`)
  }

  let created = false
  if (!getJSON(tid, 'config', null)) {
    created = true
    const base = createDefaultTenantConfig(tid)
    const cfg = {
      ...base,
      businessName: preset.businessName,
      businessType: preset.businessType,
      modules: { ...base.modules, ...preset.modules },
      ...(typeof preset.deliveryFee === 'number'
        ? { deliveryFee: preset.deliveryFee }
        : {}),
    }
    setJSON(tid, 'config', cfg)
    registerTenantInGlobalList({
      tenantId: tid,
      businessName: cfg.businessName,
    })
    const passHash = await hashPassword(UNIFIED_POS_LOGIN.password)
    const admin = {
      id: newId(),
      tenantId: tid,
      name: 'Demo Admin',
      email: UNIFIED_POS_LOGIN.adminEmail,
      passwordHash: passHash,
      role: 'admin',
      pin: UNIFIED_POS_LOGIN.adminPin,
      active: true,
      lastLogin: null,
      registerId: null,
    }
    const cashier = {
      id: newId(),
      tenantId: tid,
      name: 'Demo Cashier',
      email: UNIFIED_POS_LOGIN.cashierEmail,
      passwordHash: passHash,
      role: 'cashier',
      pin: UNIFIED_POS_LOGIN.cashierPin,
      active: true,
      lastLogin: null,
      registerId: null,
    }
    setJSON(tid, 'users', [admin, cashier])
  }

  const products = getJSON(tid, 'products', [])
  if (created || !Array.isArray(products) || products.length === 0) {
    await seedTenant(tid, preset.businessType)
  }
  await ensureUnifiedDemoStaff(tid)
  return tid
}

/** Legacy one-click: slug `demo` (pharmacy hub). */
export async function ensureDemoWorkspace() {
  return ensureCategoryDemoWorkspace(LEGACY_HUB_SLUG)
}
