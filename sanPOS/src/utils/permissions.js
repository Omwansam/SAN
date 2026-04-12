/** @typedef {'cashier'|'manager'|'admin'|'superadmin'} Role */

const matrix = {
  pos: ['cashier', 'manager', 'admin', 'superadmin'],
  catalog: ['manager', 'admin', 'superadmin'],
  view_own_orders: ['cashier', 'manager', 'admin', 'superadmin'],
  customer_lookup: ['cashier', 'manager', 'admin', 'superadmin'],
  reports: ['manager', 'admin', 'superadmin'],
  refund: ['manager', 'admin', 'superadmin'],
  discount_high: ['manager', 'admin', 'superadmin'],
  inventory: ['manager', 'admin', 'superadmin'],
  settings: ['admin', 'superadmin'],
  users: ['admin', 'superadmin'],
  registers: ['admin', 'superadmin'],
  export: ['admin', 'superadmin'],
  /** Sell / ring up controlled Rx lines (demo gate). */
  controlled_substance: ['manager', 'admin', 'superadmin'],
  switch_tenant: ['superadmin'],
  superadmin_panel: ['superadmin'],
}

/**
 * @param {Role|string|null|undefined} role
 * @param {keyof typeof matrix} action
 */
export function canUser(role, action) {
  if (!role || !matrix[action]) return false
  return matrix[action].includes(role)
}
