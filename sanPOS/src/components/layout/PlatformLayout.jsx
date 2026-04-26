import {
  Activity,
  AreaChart,
  BadgeDollarSign,
  Bot,
  Flag,
  LifeBuoy,
  Menu,
  ReceiptText,
  Rocket,
  Settings2,
  ShieldAlert,
  Sparkles,
  Users2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PlatformGlobalSearch } from '../platform/PlatformGlobalSearch'
import { useAuth } from '../../hooks/useAuth'
import { getPlatformAlerts, getPlatformOverview } from '../../utils/platformData'

function navClass({ isActive }) {
  return `group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-gradient-to-r from-indigo-600 to-[var(--brand)] text-white shadow-md shadow-indigo-500/25'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/90'
  }`
}

function SectionTitle({ children }) {
  return (
    <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
      {children}
    </p>
  )
}

export function PlatformLayout() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { totals } = getPlatformOverview()
  const alertCount = getPlatformAlerts().length

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(99 102 241 / 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgb(14 165 233 / 0.2), transparent)',
        }}
        aria-hidden
      />

      <header className="relative z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:gap-4">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 md:hidden"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle platform menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/platform" className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-black text-white shadow-lg shadow-indigo-500/30">
                S
              </span>
              <span className="hidden flex-col sm:flex">
                <span className="text-sm font-bold tracking-tight text-white">SanPOS Control</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                  SaaS operations
                </span>
              </span>
            </Link>
          </div>

          <PlatformGlobalSearch />

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:gap-3">
            {alertCount > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/platform')}
                className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
              >
                {alertCount} alert{alertCount === 1 ? '' : 's'}
              </button>
            ) : null}
            <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:inline">
              Local
            </span>
            <div className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden />
            <div className="text-right">
              <p className="max-w-[140px] truncate text-sm font-semibold text-white">{currentUser?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-400">Superadmin</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:py-6">
        <aside className={`${mobileNavOpen ? 'block' : 'hidden'} w-full shrink-0 md:block md:w-72`}>
          <nav className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 shadow-xl shadow-black/20 backdrop-blur-md">
            <section className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">Platform pulse</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <PulseCell label="Tenants" value={totals.tenants} />
                <PulseCell label="Users" value={totals.users} />
                <PulseCell label="Orders" value={totals.orders} />
                <PulseCell
                  label="Revenue"
                  value={`KES ${Math.round(totals.revenue).toLocaleString()}`}
                />
              </div>
            </section>

            <SectionTitle>Control tower</SectionTitle>
            <NavLink to="/platform" end className={navClass}>
              <Activity className="h-4 w-4 shrink-0 opacity-90" />
              Overview
            </NavLink>
            <NavLink to="/platform/analytics" className={navClass}>
              <AreaChart className="h-4 w-4 shrink-0 opacity-90" />
              Analytics
            </NavLink>

            <SectionTitle>Tenant operations</SectionTitle>
            <NavLink to="/platform/tenants" className={navClass}>
              <Users2 className="h-4 w-4 shrink-0 opacity-90" />
              Tenant directory
            </NavLink>

            <SectionTitle>Revenue</SectionTitle>
            <NavLink to="/platform/subscriptions" className={navClass}>
              <BadgeDollarSign className="h-4 w-4 shrink-0 opacity-90" />
              Subscriptions
            </NavLink>
            <NavLink to="/platform/invoices" className={navClass}>
              <ReceiptText className="h-4 w-4 shrink-0 opacity-90" />
              Invoices
            </NavLink>
            <NavLink to="/platform/billing" className={navClass}>
              <BadgeDollarSign className="h-4 w-4 shrink-0 opacity-90" />
              Plan mix
            </NavLink>

            <SectionTitle>Product ops</SectionTitle>
            <NavLink to="/platform/feature-flags" className={navClass}>
              <Flag className="h-4 w-4 shrink-0 opacity-90" />
              Feature flags
            </NavLink>
            <NavLink to="/platform/releases" className={navClass}>
              <Rocket className="h-4 w-4 shrink-0 opacity-90" />
              Releases
            </NavLink>
            <NavLink to="/platform/design-system" className={navClass}>
              <Sparkles className="h-4 w-4 shrink-0 opacity-90" />
              Design lab
            </NavLink>

            <SectionTitle>Operations & trust</SectionTitle>
            <NavLink to="/platform/broadcasts" className={navClass}>
              <Bot className="h-4 w-4 shrink-0 opacity-90" />
              Broadcasts
            </NavLink>
            <NavLink to="/platform/support" className={navClass}>
              <LifeBuoy className="h-4 w-4 shrink-0 opacity-90" />
              Support
            </NavLink>
            <NavLink to="/platform/security" className={navClass}>
              <ShieldAlert className="h-4 w-4 shrink-0 opacity-90" />
              Security
            </NavLink>
            <NavLink to="/platform/audit" className={navClass}>
              <Activity className="h-4 w-4 shrink-0 opacity-90" />
              Audit log
            </NavLink>

            <SectionTitle>System</SectionTitle>
            <NavLink to="/platform/settings" className={navClass}>
              <Settings2 className="h-4 w-4 shrink-0 opacity-90" />
              Settings
            </NavLink>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-6 md:rounded-3xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function PulseCell({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  )
}
