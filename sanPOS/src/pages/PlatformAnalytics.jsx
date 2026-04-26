import { Activity, AlertTriangle, BarChart3, Download, Gauge, PieChart, Save, TrendingUp, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  deletePlatformAnalyticsPreset,
  detectTrendAnomalies,
  getPlatformAnalyticsPresets,
  getPlatformOverview,
  getPlatformPaymentMethodBreakdown,
  getPlatformTrendByRange,
  getTenantCompareSeries,
  savePlatformAnalyticsPreset,
} from '../utils/platformData'

function SingleLineChart({ points, color = '#22d3ee', anomalies = [] }) {
  const max = Math.max(1, ...points.map((p) => p.value))
  const w = 560
  const h = 180
  const step = points.length > 1 ? w / (points.length - 1) : w
  const coords = points.map((p, i) => [i * step, h - (p.value / max) * (h - 16) - 8])
  const line = coords.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
      <polyline points={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={color} />
      ))}
      {anomalies.map((a) => {
        const i = a.idx
        const [x, y] = coords[i] || [0, 0]
        return (
          <g key={`${a.type}-${a.idx}`}>
            <circle cx={x} cy={y} r="7" fill={a.type === 'spike' ? '#f59e0b' : '#ef4444'} opacity="0.28" />
            <circle cx={x} cy={y} r="3.5" fill={a.type === 'spike' ? '#f59e0b' : '#ef4444'} />
          </g>
        )
      })}
    </svg>
  )
}

function MultiLineChart({ series }) {
  const w = 560
  const h = 190
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.series.map((p) => p.value)),
  )
  const len = series[0]?.series?.length || 1
  const step = len > 1 ? w / (len - 1) : w
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full">
      {series.map((tenant) => {
        const coords = tenant.series.map((p, i) => [i * step, h - (p.value / max) * (h - 20) - 10])
        const line = coords.map(([x, y]) => `${x},${y}`).join(' ')
        return (
          <g key={tenant.tenantId}>
            <polyline points={line} fill="none" stroke={tenant.color} strokeWidth="3" strokeLinecap="round" />
            {coords.map(([x, y], i) => (
              <circle key={`${tenant.tenantId}-${i}`} cx={x} cy={y} r="3.2" fill={tenant.color} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export default function PlatformAnalytics() {
  const [range, setRange] = useState('30d')
  const [metric, setMetric] = useState('revenue')
  const [selectedTenantIds, setSelectedTenantIds] = useState([])
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState(getPlatformAnalyticsPresets())

  const trend = useMemo(() => getPlatformTrendByRange(range, metric), [range, metric])
  const methods = getPlatformPaymentMethodBreakdown()
  const { totals, tenants } = getPlatformOverview()
  const maxMethod = Math.max(1, ...methods.map((m) => m.count))
  const compareSeries = useMemo(
    () => getTenantCompareSeries(selectedTenantIds, range, metric),
    [selectedTenantIds, range, metric],
  )
  const anomalies = useMemo(() => detectTrendAnomalies(trend), [trend])
  const metricLabel = metric === 'orders' ? 'Orders' : 'Revenue'
  const avg = Math.round(trend.reduce((s, p) => s + p.value, 0) / Math.max(1, trend.length))

  function toggleTenant(id) {
    setSelectedTenantIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  function exportCsv(filename, rows) {
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportTrendCsv() {
    exportCsv(`platform-trend-${range}-${metric}.csv`, [
      ['label', 'value', 'metric'],
      ...trend.map((p) => [p.label, p.value, metric]),
    ])
    toast.success('Trend CSV exported')
  }

  function savePreset() {
    const next = savePlatformAnalyticsPreset({
      name: presetName || `${range.toUpperCase()} ${metric}`,
      range,
      metric,
      tenantIds: selectedTenantIds,
    })
    setPresets(next)
    setPresetName('')
    toast.success('Analytics preset saved')
  }

  function applyPreset(preset) {
    setRange(preset.range)
    setMetric(preset.metric)
    setSelectedTenantIds(preset.tenantIds || [])
    toast.success(`Applied preset: ${preset.name}`)
  }

  function removePreset(id) {
    setPresets(deletePlatformAnalyticsPreset(id))
    toast.success('Preset removed')
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <BarChart3 className="h-6 w-6 text-cyan-300" />
          Platform analytics
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Global trends across tenants for revenue, orders, and payment behavior.
        </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                range === r
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
          {['revenue', 'orders'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                metric === m
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {m === 'revenue' ? 'Revenue' : 'Orders'}
            </button>
          ))}
          <button
            type="button"
            onClick={exportTrendCsv}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Trend CSV
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved analytics presets</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <div key={preset.id} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
                  <button type="button" onClick={() => applyPreset(preset)} className="font-semibold hover:text-cyan-300">
                    {preset.name}
                  </button>
                  <button type="button" onClick={() => removePreset(preset.id)} className="text-slate-500 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={savePreset}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Tenant count" value={totals.tenants} />
        <Kpi label="Orders" value={totals.orders} />
        <Kpi label="Payments" value={totals.payments} />
        <Kpi label="Revenue" value={`KES ${Math.round(totals.revenue).toLocaleString()}`} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={TrendingUp} label={`${metricLabel} avg`} value={metric === 'revenue' ? `KES ${avg.toLocaleString()}` : avg} />
        <Kpi icon={Gauge} label={`${metricLabel} peak`} value={metric === 'revenue' ? `KES ${Math.max(...trend.map((p) => p.value)).toLocaleString()}` : Math.max(...trend.map((p) => p.value))} />
        <Kpi icon={Activity} label="Compare slots used" value={`${selectedTenantIds.length}/4`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 lg:col-span-2">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <Activity className="h-4 w-4 text-indigo-400" />
            {metricLabel} trend
          </h2>
          <SingleLineChart points={trend} anomalies={anomalies} color={metric === 'orders' ? '#818cf8' : '#22d3ee'} />
          {anomalies.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {anomalies.map((a) => (
                <span
                  key={`${a.type}-${a.idx}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                    a.type === 'spike' ? 'bg-amber-500/20 text-amber-200' : 'bg-red-500/20 text-red-200'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {a.type.toUpperCase()} {a.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No major anomalies detected in selected window.</p>
          )}
          <div className={`mt-1 grid gap-2 text-[11px] text-slate-500 ${range === '90d' ? 'grid-cols-12' : range === '7d' ? 'grid-cols-7' : 'grid-cols-10'}`}>
            {trend.map((p) => (
              <span key={p.label} className="text-center">
                {p.label}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <PieChart className="h-4 w-4 text-cyan-400" />
            Payment methods
          </h2>
          <div className="mt-4 space-y-3">
            {methods.length === 0 ? (
              <p className="text-sm text-slate-500">No payment data yet.</p>
            ) : (
              methods.map((m) => (
                <div key={m.method}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span className="uppercase">{m.method}</span>
                    <span>{m.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                      style={{ width: `${Math.round((m.count / maxMethod) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Tenant compare mode</h2>
          <p className="mt-1 text-xs text-slate-500">
            Select up to 4 workspaces to overlay {metricLabel.toLowerCase()} trajectories.
          </p>
          {compareSeries.length > 0 ? (
            <>
              <MultiLineChart series={compareSeries} />
              <div className="mt-2 flex flex-wrap gap-2">
                {compareSeries.map((s) => (
                  <span key={s.tenantId} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.businessName}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-500">Select workspaces below to enable overlay chart.</p>
          )}
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Select tenants</h2>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
            {tenants.map((t) => (
              <label key={t.tenantId} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <span className="truncate text-slate-200">{t.businessName}</span>
                <input
                  type="checkbox"
                  checked={selectedTenantIds.includes(t.tenantId)}
                  disabled={!selectedTenantIds.includes(t.tenantId) && selectedTenantIds.length >= 4}
                  onChange={() => toggleTenant(t.tenantId)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Tenant performance table</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Health</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map((t) => (
                <tr key={t.tenantId}>
                  <td className="px-4 py-3 text-sm text-white">{t.businessName}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.healthScore}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.orders}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.payments}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">KES {Math.round(t.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value, icon: Icon = null }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </article>
  )
}
