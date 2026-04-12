/**
 * POS and operational UI differ by business type so a pharmacy register
 * never surfaces restaurant-only flows (kitchen, table split, etc.).
 */
const BY_TYPE = {
  retail: { kitchen: false, tables: false, layout: 'retail' },
  grocery: { kitchen: false, tables: false, layout: 'grocery' },
  pharmacy: { kitchen: false, tables: false, layout: 'pharmacy' },
  restaurant: { kitchen: true, tables: true, layout: 'restaurant' },
  salon: { kitchen: false, tables: false, layout: 'salon' },
  custom: { kitchen: false, tables: false, layout: 'custom' },
}

export function getPosExperience(tenantConfig) {
  const bt = tenantConfig?.businessType || 'retail'
  const row = BY_TYPE[bt] ?? BY_TYPE.retail
  const m = tenantConfig?.modules ?? {}
  return {
    businessType: bt,
    layoutKey: row.layout,
    showKitchenNav: Boolean(m.kitchenDisplay && row.kitchen),
    showTablesNav: Boolean(m.tables && row.tables),
    supportsTableSplit: Boolean(m.tables && row.tables),
    sendToKitchenOnSale: Boolean(m.kitchenDisplay && row.kitchen),
    canUseKitchenPage: Boolean(m.kitchenDisplay && row.kitchen),
    canUseTablesPage: Boolean(m.tables && row.tables),
  }
}
