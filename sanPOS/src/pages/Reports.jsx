import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, startOfDay, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { formatCurrency } from '../utils/currency'
import { getJSON, setJSON } from '../utils/storage'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { useTenant } from '../hooks/useTenant'

const COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#14b8a6']

export default function Reports() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const { orders } = useOrders()
  const { products, categories } = useProducts()
  const [closed, setClosed] = useState(() =>
    tenantId ? getJSON(tenantId, 'zReportClosed', false) : false,
  )
  const [dispensing, setDispensing] = useState([])

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() => setDispensing(getJSON(tenantId, 'dispensingLog', [])))
  }, [tenantId, orders.length])

  const today = startOfDay(new Date())
  const todayOrders = orders.filter(
    (o) => o.status === 'completed' && startOfDay(new Date(o.createdAt)) >= today,
  )
  const revenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0)
  const tax = todayOrders.reduce((s, o) => s + (o.taxAmount || 0), 0)
  const refunds = orders.filter((o) => o.status === 'refunded').length

  const lineData = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const key = format(d, 'yyyy-MM-dd')
      const sum = orders
        .filter(
          (o) =>
            o.status === 'completed' &&
            format(new Date(o.createdAt), 'yyyy-MM-dd') === key,
        )
        .reduce((s, o) => s + (o.total || 0), 0)
      days.push({ date: format(d, 'MMM d'), total: sum })
    }
    return days
  }, [orders])

  const byCat = useMemo(() => {
    const map = {}
    for (const o of orders.filter((x) => x.status === 'completed')) {
      for (const it of o.items || []) {
        const pr = products.find((p) => p.id === it.productId)
        const cid = pr?.categoryId ?? 'other'
        map[cid] = (map[cid] || 0) + (it.total || 0)
      }
    }
    return Object.entries(map)
      .map(([id, total]) => ({
        name: categories.find((c) => c.id === id)?.name ?? 'Other',
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [orders, products, categories])

  const payMix = useMemo(() => {
    const m = {}
    for (const o of orders.filter((x) => x.status === 'completed')) {
      for (const p of o.payments || []) {
        m[p.method] = (m[p.method] || 0) + (p.amount || 0)
      }
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [orders])

  const grossProfit = useMemo(() => {
    let rev = 0
    let cost = 0
    for (const o of orders.filter((x) => x.status === 'completed')) {
      for (const it of o.items || []) {
        const pr = products.find((p) => p.id === it.productId)
        const c = (pr?.costPrice ?? 0) * (it.qty || 0)
        cost += c
        rev += it.total || 0
      }
    }
    return rev - cost
  }, [orders, products])

  function closeShift() {
    if (!tenantId) return
    setJSON(tenantId, 'zReportClosed', true)
    setClosed(true)
    toast.success('Shift closed for reporting')
  }

  if (!tenantConfig) return null
  if (!can('reports')) return <Navigate to="/pos" replace />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Reports
      </h1>
      {orders.length === 0 ? (
        <EmptyState title="No sales data yet" />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Today revenue</p>
          <p className="text-xl font-semibold">
            {formatCurrency(revenue, tenantConfig)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-xl font-semibold">{todayOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Avg order</p>
          <p className="text-xl font-semibold">
            {formatCurrency(
              todayOrders.length ? revenue / todayOrders.length : 0,
              tenantConfig,
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Gross profit (est.)</p>
          <p className="text-xl font-semibold">
            {formatCurrency(grossProfit, tenantConfig)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 font-medium">Sales (30 days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 font-medium">Revenue by category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCat}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 font-medium">Payment methods</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={payMix}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {payMix.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {tenantConfig?.modules?.prescriptions && dispensing.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-medium">Dispensing log (recent)</h2>
          <div className="max-h-64 overflow-auto text-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-2">When</th>
                  <th className="py-2 pr-2">Order</th>
                  <th className="py-2">Lines</th>
                </tr>
              </thead>
              <tbody>
                {dispensing.slice(0, 25).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-2 pr-2 align-top text-gray-500">
                      {row.createdAt
                        ? format(new Date(row.createdAt), 'MMM d HH:mm')
                        : '—'}
                    </td>
                    <td className="py-2 pr-2 align-top font-mono text-xs">
                      {(row.orderId ?? '').slice(0, 8)}…
                    </td>
                    <td className="py-2 align-top">
                      <ul className="list-inside list-disc text-gray-700 dark:text-gray-300">
                        {(row.lines ?? []).map((ln, i) => (
                          <li key={i}>
                            {ln.name}
                            {ln.controlled ? ' (controlled)' : ''}
                            {ln.rxNumber ? ` · Rx ${ln.rxNumber}` : ''}
                            {ln.deaNumber ? ` · DEA ${ln.deaNumber}` : ''}
                            {ln.pickupVerified ? ' · pickup ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Z-Report (today)</h2>
        <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <li>Total sales: {formatCurrency(revenue, tenantConfig)}</li>
          <li>Tax collected: {formatCurrency(tax, tenantConfig)}</li>
          <li>Refunds count: {refunds}</li>
          <li>Net revenue: {formatCurrency(revenue, tenantConfig)}</li>
          <li>Status: {closed ? 'Day locked' : 'Open'}</li>
        </ul>
        {can('reports') && !closed ? (
          <Button type="button" className="mt-4" onClick={closeShift}>
            Close shift
          </Button>
        ) : null}
      </div>
    </div>
  )
}
