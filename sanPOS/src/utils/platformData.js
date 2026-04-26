import { TENANT_EXPORT_SEGMENTS } from './tenantExportKeys'
import { createDefaultTenantConfig, withTenantDefaults } from './tenantDefaults'
import { getGlobalJSON, getJSON, setGlobalJSON, setJSON } from './storage'
import { listRegisteredTenants } from './tenantRegistry'

export function readTenantSnapshot(tenantId) {
  const config = withTenantDefaults(
    getJSON(tenantId, 'config', createDefaultTenantConfig(tenantId)),
    tenantId,
  )
  const orders = getJSON(tenantId, 'orders', [])
  const users = getJSON(tenantId, 'users', [])
  const products = getJSON(tenantId, 'products', [])
  const customers = getJSON(tenantId, 'customers', [])
  const branches = getJSON(tenantId, 'branches', [])
  const stockLogs = getJSON(tenantId, 'stockLogs', [])
  const payments = Array.isArray(orders)
    ? orders.flatMap((order) => (Array.isArray(order?.payments) ? order.payments : []))
    : []
  const roleCount = (Array.isArray(users) ? users : []).reduce(
    (acc, user) => {
      const role = String(user?.role || 'cashier').toLowerCase()
      acc[role] = (acc[role] || 0) + 1
      return acc
    },
    { cashier: 0, manager: 0, admin: 0, superadmin: 0 },
  )
  const revenue = Array.isArray(orders)
    ? orders.reduce((sum, order) => sum + Number(order?.total || 0), 0)
    : 0
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0)
  const paymentMethods = payments.reduce((acc, payment) => {
    const method = String(payment?.method || 'unknown').toLowerCase()
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {})

  return {
    tenantId,
    config,
    orders: Array.isArray(orders) ? orders : [],
    users: Array.isArray(users) ? users : [],
    products: Array.isArray(products) ? products : [],
    customers: Array.isArray(customers) ? customers : [],
    branches: Array.isArray(branches) ? branches : [],
    stockLogs: Array.isArray(stockLogs) ? stockLogs : [],
    payments,
    roleCount,
    revenue,
    paymentTotal,
    paymentMethods,
  }
}

function computeTenantHealthScore(row) {
  let score = 0
  if (row.users > 0) score += 18
  if (row.orders > 0) score += 28
  if (row.products > 0) score += 16
  if (row.customers > 0) score += 12
  if (row.branches > 0) score += 10
  if (row.payments > 0) score += 16
  return Math.min(100, score)
}

export function listPlatformTenantRows() {
  const registry = listRegisteredTenants()
  return registry.map((entry) => {
    const snapshot = readTenantSnapshot(entry.tenantId)
    const base = {
      tenantId: entry.tenantId,
      businessName: snapshot.config?.businessName || entry.businessName || 'Unnamed workspace',
      businessType: snapshot.config?.businessType || 'retail',
      createdAt: entry.createdAt || null,
      users: snapshot.users.length,
      products: snapshot.products.length,
      customers: snapshot.customers.length,
      orders: snapshot.orders.length,
      payments: snapshot.payments.length,
      branches: snapshot.branches.length,
      revenue: snapshot.revenue,
      paymentTotal: snapshot.paymentTotal,
      paymentMethods: snapshot.paymentMethods,
      roleCount: snapshot.roleCount,
      modules: snapshot.config?.modules || {},
      primaryColor: snapshot.config?.primaryColor || '#2563eb',
      billingPlan: snapshot.config?.billing?.planName || 'Starter',
      subscription: {
        planName: snapshot.config?.billing?.planName || 'Starter',
        status: snapshot.config?.billing?.expiresAt ? 'trial_or_paid' : 'active',
        expiresAt: snapshot.config?.billing?.expiresAt || null,
      },
    }
    return { ...base, healthScore: computeTenantHealthScore(base) }
  })
}

export function getPlatformTenantById(tenantId) {
  return listPlatformTenantRows().find((tenant) => tenant.tenantId === tenantId) || null
}

export function getPlatformOverview() {
  const tenants = listPlatformTenantRows()
  const totals = tenants.reduce(
    (acc, row) => {
      acc.tenants += 1
      acc.users += row.users
      acc.products += row.products
      acc.orders += row.orders
      acc.customers += row.customers
      acc.payments += row.payments
      acc.revenue += row.revenue
      acc.paymentTotal += row.paymentTotal
      acc.roleBreakdown.cashier += row.roleCount.cashier || 0
      acc.roleBreakdown.manager += row.roleCount.manager || 0
      acc.roleBreakdown.admin += row.roleCount.admin || 0
      acc.roleBreakdown.superadmin += row.roleCount.superadmin || 0
      return acc
    },
    {
      tenants: 0,
      users: 0,
      products: 0,
      orders: 0,
      customers: 0,
      payments: 0,
      revenue: 0,
      paymentTotal: 0,
      roleBreakdown: { cashier: 0, manager: 0, admin: 0, superadmin: 0 },
    },
  )
  return { tenants, totals }
}

export function getPlatformSubscriptions() {
  return listPlatformTenantRows().map((tenant) => ({
    tenantId: tenant.tenantId,
    businessName: tenant.businessName,
    planName: tenant.subscription.planName,
    status: tenant.subscription.status,
    expiresAt: tenant.subscription.expiresAt,
    revenue: tenant.revenue,
    paymentTotal: tenant.paymentTotal,
  }))
}

export function getPlatformRevenueTrend() {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const tenants = listPlatformTenantRows()
  const totalRevenue = tenants.reduce((sum, t) => sum + Number(t.revenue || 0), 0)
  const base = Math.max(1, totalRevenue / 6)
  return labels.map((label, idx) => {
    const factor = 0.7 + idx * 0.08
    return {
      label,
      revenue: Math.round(base * factor),
      orders: Math.round((base * factor) / 1200),
    }
  })
}

export function getPlatformTrendByRange(range = '30d', metric = 'revenue') {
  const days = range === '7d' ? 7 : range === '90d' ? 12 : 10
  const labels = Array.from({ length: days }).map((_, i) => {
    if (range === '7d') return `D${i + 1}`
    if (range === '90d') return `W${i + 1}`
    return `P${i + 1}`
  })
  const tenants = listPlatformTenantRows()
  const totalRevenue = tenants.reduce((sum, t) => sum + Number(t.revenue || 0), 0)
  const totalOrders = tenants.reduce((sum, t) => sum + Number(t.orders || 0), 0)
  const revenueBase = Math.max(1, totalRevenue / days)
  const orderBase = Math.max(1, totalOrders / days)
  return labels.map((label, idx) => {
    const wave = 0.85 + (Math.sin((idx / Math.max(1, days - 1)) * Math.PI) + 1) * 0.25
    const revenue = Math.round(revenueBase * wave)
    const orders = Math.round(orderBase * wave)
    return {
      label,
      revenue,
      orders,
      value: metric === 'orders' ? orders : revenue,
    }
  })
}

export function detectTrendAnomalies(points = []) {
  if (!Array.isArray(points) || points.length < 3) return []
  const avg = points.reduce((s, p) => s + Number(p.value || 0), 0) / points.length
  if (avg <= 0) return []
  return points
    .map((p, i) => {
      const value = Number(p.value || 0)
      const ratio = value / avg
      if (ratio >= 1.35) return { idx: i, label: p.label, type: 'spike', value }
      if (ratio <= 0.65) return { idx: i, label: p.label, type: 'drop', value }
      return null
    })
    .filter(Boolean)
}

export function getTenantCompareSeries(tenantIds = [], range = '30d', metric = 'revenue') {
  const selected = listPlatformTenantRows().filter((t) => tenantIds.includes(t.tenantId))
  const points = getPlatformTrendByRange(range, metric)
  return selected.map((tenant, idx) => {
    const scaleBase = metric === 'orders' ? Math.max(1, tenant.orders) : Math.max(1, tenant.revenue)
    const maxBase = selected.reduce(
      (m, t) => Math.max(m, metric === 'orders' ? Math.max(1, t.orders) : Math.max(1, t.revenue)),
      1,
    )
    const scale = scaleBase / maxBase
    const series = points.map((point, pIdx) => {
      const wobble = 0.92 + (((pIdx + idx) % 3) * 0.05)
      return {
        label: point.label,
        value: Math.max(1, Math.round(point.value * scale * wobble)),
      }
    })
    return {
      tenantId: tenant.tenantId,
      businessName: tenant.businessName,
      color: tenant.primaryColor || '#22d3ee',
      series,
    }
  })
}

export function getPlatformAnalyticsPresets() {
  return getGlobalJSON('platformAnalyticsPresets', [
    {
      id: 'exec-weekly',
      name: 'Exec Weekly',
      range: '7d',
      metric: 'revenue',
      tenantIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'payments-deep-dive',
      name: 'Payments Deep Dive',
      range: '30d',
      metric: 'orders',
      tenantIds: [],
      createdAt: new Date().toISOString(),
    },
  ])
}

export function savePlatformAnalyticsPreset({ name, range, metric, tenantIds }) {
  const existing = getPlatformAnalyticsPresets()
  const next = [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: String(name || '').trim() || 'Untitled preset',
      range,
      metric,
      tenantIds: Array.isArray(tenantIds) ? tenantIds.slice(0, 4) : [],
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 20)
  setGlobalJSON('platformAnalyticsPresets', next)
  return next
}

export function deletePlatformAnalyticsPreset(id) {
  const existing = getPlatformAnalyticsPresets()
  const next = existing.filter((p) => p.id !== id)
  setGlobalJSON('platformAnalyticsPresets', next)
  return next
}

export function getPlatformInvoices() {
  return listPlatformTenantRows().flatMap((tenant) => {
    const snapshot = readTenantSnapshot(tenant.tenantId)
    return snapshot.payments.map((payment, idx) => ({
      id: `${tenant.tenantId}-${idx + 1}`,
      tenantId: tenant.tenantId,
      businessName: tenant.businessName,
      method: payment?.method || 'unknown',
      amount: Number(payment?.amount || 0),
      reference: payment?.reference || null,
      createdAt: payment?.createdAt || null,
      status: Number(payment?.amount || 0) > 0 ? 'paid' : 'pending',
    }))
  })
}

export function getPlatformPaymentMethodBreakdown() {
  const totals = {}
  listPlatformTenantRows().forEach((tenant) => {
    Object.entries(tenant.paymentMethods || {}).forEach(([method, count]) => {
      totals[method] = (totals[method] || 0) + Number(count || 0)
    })
  })
  const rows = Object.entries(totals).map(([method, count]) => ({ method, count }))
  rows.sort((a, b) => b.count - a.count)
  return rows
}

export function getTenantUsers(tenantId) {
  return readTenantSnapshot(tenantId).users
}

export function getTenantOrders(tenantId) {
  return readTenantSnapshot(tenantId).orders
}

export function getTenantPayments(tenantId) {
  return readTenantSnapshot(tenantId).payments
}

export function exportTenantBundle(tenantId) {
  const payload = {}
  for (const segment of TENANT_EXPORT_SEGMENTS) {
    payload[segment] = getJSON(tenantId, segment, null)
  }
  return payload
}

export function savePlatformAnnouncement(message) {
  const existing = getGlobalJSON('platformAnnouncements', [])
  const next = [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      message: String(message || '').trim(),
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ].filter((item) => item.message)
  setGlobalJSON('platformAnnouncements', next.slice(0, 20))
  return next
}

export function getPlatformAnnouncements() {
  return getGlobalJSON('platformAnnouncements', [])
}

export function getPlatformFeatureFlags() {
  return getGlobalJSON('platformFeatureFlags', {
    platformMaintenanceMode: false,
    enableGlobalBroadcasts: true,
    enableCrossTenantExports: true,
    enableExperimentalDesignLab: false,
  })
}

export function setPlatformFeatureFlags(flags) {
  setGlobalJSON('platformFeatureFlags', flags)
}

export function getPlatformReleases() {
  return getGlobalJSON('platformReleases', [
    { id: 'rel-1', name: 'v2.4.0', channel: 'stable', rollout: 100, status: 'live' },
    { id: 'rel-2', name: 'v2.5.0-beta', channel: 'canary', rollout: 20, status: 'rolling_out' },
  ])
}

export function setPlatformReleases(releases) {
  setGlobalJSON('platformReleases', releases)
}

export function getPlatformSupportTickets() {
  return getGlobalJSON('platformSupportTickets', [
    {
      id: 'TCK-1001',
      tenantId: 'acme',
      subject: 'Failed card sync',
      priority: 'high',
      status: 'open',
      createdAt: new Date().toISOString(),
    },
  ])
}

export function getPlatformSupportSummary() {
  const tickets = getPlatformSupportTickets()
  const open = tickets.filter((t) => t.status === 'open').length
  const high = tickets.filter((t) => t.priority === 'high').length
  const resolved = tickets.filter((t) => t.status === 'resolved').length
  return { open, high, resolved, total: tickets.length }
}

export function getPlatformAuditLogs() {
  return getGlobalJSON('platformAuditLogs', [])
}

export function pushPlatformAuditLog(action, details = {}) {
  const logs = getPlatformAuditLogs()
  const next = [
    {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      action,
      details,
      createdAt: new Date().toISOString(),
    },
    ...logs,
  ].slice(0, 300)
  setGlobalJSON('platformAuditLogs', next)
  return next
}

export function setTenantPlan(tenantId, planName) {
  const config = withTenantDefaults(
    getJSON(tenantId, 'config', createDefaultTenantConfig(tenantId)),
    tenantId,
  )
  const next = {
    ...config,
    billing: {
      ...(config.billing || {}),
      planName,
    },
  }
  setJSON(tenantId, 'config', next)
}

/** Derived alerts for the control tower (local demo data). */
export function getPlatformAlerts() {
  const flags = getPlatformFeatureFlags()
  const tenants = listPlatformTenantRows()
  const tickets = getPlatformSupportTickets()
  const openTickets = tickets.filter((t) => t.status === 'open').length
  const lowHealth = tenants.filter((t) => t.healthScore < 45)

  const alerts = []
  if (flags.platformMaintenanceMode) {
    alerts.push({
      id: 'maint',
      severity: 'critical',
      title: 'Maintenance mode is ON',
      detail: 'Tenants may see degraded experience until disabled.',
    })
  }
  if (openTickets > 0) {
    alerts.push({
      id: 'tickets',
      severity: 'warning',
      title: `${openTickets} open support ticket(s)`,
      detail: 'Review the Support desk queue.',
    })
  }
  lowHealth.slice(0, 3).forEach((t) => {
    alerts.push({
      id: `health-${t.tenantId}`,
      severity: 'info',
      title: `Low workspace health: ${t.businessName}`,
      detail: `Score ${t.healthScore}/100 — slug ${t.tenantId}`,
    })
  })
  return alerts
}

/** Merged feed for overview activity strip. */
export function getPlatformActivityFeed(limit = 12) {
  const announcements = getPlatformAnnouncements().map((a) => ({
    id: `ann-${a.id}`,
    type: 'broadcast',
    label: 'Broadcast',
    message: a.message,
    at: a.createdAt,
  }))
  const audits = getPlatformAuditLogs().map((log) => ({
    id: log.id,
    type: 'audit',
    label: log.action,
    message: JSON.stringify(log.details || {}),
    at: log.createdAt,
  }))
  return [...announcements, ...audits]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

/** Export every registered tenant bundle as one JSON blob (browser download). */
export function buildAllTenantsExportPayload() {
  const rows = listRegisteredTenants()
  const tenants = {}
  for (const entry of rows) {
    tenants[entry.tenantId] = exportTenantBundle(entry.tenantId)
  }
  return { exportedAt: new Date().toISOString(), tenants }
}
