import { UNIFIED_POS_LOGIN } from '../constants/demoCategoryWorkspaces'
import { hashPassword } from './password'
import { getJSON, setJSON } from './storage'
import { newId } from './uuid'

/**
 * Ensures unified category-demo staff exist with working password + PINs.
 * Upserts by email (keeps existing `id` when updating).
 *
 * @param {string} tenantId
 */
export async function ensureUnifiedDemoStaff(tenantId) {
  const tid = String(tenantId ?? '').trim().toLowerCase()
  if (!tid) return

  let list = [...getJSON(tid, 'users', [])]
  if (!Array.isArray(list)) list = []

  const passHash = await hashPassword(UNIFIED_POS_LOGIN.password)
  const specs = [
    {
      email: UNIFIED_POS_LOGIN.adminEmail,
      name: 'Demo Admin',
      role: 'admin',
      pin: UNIFIED_POS_LOGIN.adminPin,
    },
    {
      email: UNIFIED_POS_LOGIN.cashierEmail,
      name: 'Demo Cashier',
      role: 'cashier',
      pin: UNIFIED_POS_LOGIN.cashierPin,
    },
  ]

  for (const spec of specs) {
    const em = String(spec.email).toLowerCase()
    const idx = list.findIndex((u) => String(u.email ?? '').toLowerCase() === em)
    const patch = {
      tenantId: tid,
      name: spec.name,
      email: spec.email,
      role: spec.role,
      pin: spec.pin,
      passwordHash: passHash,
      active: true,
    }
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch, id: list[idx].id }
    } else {
      list.push({
        ...patch,
        id: newId(),
        lastLogin: null,
        registerId: null,
      })
    }
  }

  setJSON(tid, 'users', list)
}
