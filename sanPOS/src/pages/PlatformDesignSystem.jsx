import { useState } from 'react'
import { Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { listPlatformTenantRows } from '../utils/platformData'

const DESIGN_BLOCKS = [
  {
    title: 'POS Core',
    description: 'Checkout, cart state, cashier session, payment flow.',
    status: 'ready',
  },
  {
    title: 'Inventory & Catalog',
    description: 'Products, categories, stock logs, and branch stock views.',
    status: 'ready',
  },
  {
    title: 'Reports & Analytics',
    description: 'Revenue charts, order exports, and growth snapshots.',
    status: 'in-progress',
  },
  {
    title: 'Tenant Branding',
    description: 'Global themes, logos, color kits, and module toggles.',
    status: 'planned',
  },
]

function pillClass(status) {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (status === 'in-progress') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'
}

export default function PlatformDesignSystem() {
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [radius, setRadius] = useState('16')
  const tenants = listPlatformTenantRows()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <Palette className="h-6 w-6 text-cyan-300" />
          POS design control
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          One place to track every POS frontend surface before platform APIs go live.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {DESIGN_BLOCKS.map((item) => (
          <article key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">{item.title}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass(item.status)}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{item.description}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-base font-semibold text-white">Theme lab</h2>
          <p className="mt-1 text-sm text-slate-400">
            Test platform-wide style direction before rolling out per tenant.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Primary color</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Border radius</span>
              <input
                type="number"
                min="4"
                max="28"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </label>
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-white/20 p-4">
            <button
              type="button"
              style={{ backgroundColor: primaryColor, borderRadius: `${radius}px` }}
              className="px-4 py-2 text-sm font-semibold text-white shadow"
            >
              Preview CTA
            </button>
          </div>
          <Button type="button" className="mt-3" onClick={() => toast.success('Theme preset saved (frontend local).')}>
            Save theme preset
          </Button>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-base font-semibold text-white">Tenant design coverage</h2>
          <p className="mt-1 text-sm text-slate-400">
            Workspaces with custom primary branding.
          </p>
          <ul className="mt-3 space-y-2">
            {tenants.slice(0, 8).map((tenant) => (
              <li key={tenant.tenantId} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-sm text-slate-200">{tenant.businessName}</span>
                <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tenant.primaryColor }} />
                  {tenant.primaryColor}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
