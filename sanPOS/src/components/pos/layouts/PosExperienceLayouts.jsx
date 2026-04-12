import { Link } from 'react-router-dom'
import {
  Armchair,
  CalendarDays,
  LayoutTemplate,
  Pill,
  ShoppingBasket,
  UtensilsCrossed,
} from 'lucide-react'

function shellClass() {
  return 'shrink-0 rounded-3xl border border-gray-200/80 bg-gradient-to-br from-white via-white to-[var(--brand)]/[0.06] px-4 py-4 shadow-[var(--surface-card-shadow)] dark:border-gray-700/80 dark:from-gray-900 dark:via-gray-900 dark:to-[var(--brand)]/[0.08]'
}

export function RetailPosLayout({
  businessName,
  businessLabel,
  catalogStatsLine,
  grid,
  cart,
  mobileFab,
  drawer,
  modals,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className={shellClass()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--brand)]">
              Point of sale
            </p>
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
              {businessName ?? 'Register'}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {catalogStatsLine}
              <span className="text-gray-400"> · </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {businessLabel}
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--brand)]/35 bg-[var(--brand)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            {businessLabel}
          </span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {grid}
        {cart}
        {mobileFab}
        {drawer}
        {modals}
      </div>
    </div>
  )
}

export function GroceryPosLayout({
  businessName,
  businessLabel,
  catalogStatsLine,
  grid,
  cart,
  mobileFab,
  drawer,
  modals,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className={`${shellClass()} border-sky-200/70 dark:border-sky-900/45`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-800 dark:text-sky-400">
              <ShoppingBasket className="h-3.5 w-3.5" aria-hidden />
              Grocery checkout
            </p>
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
              {businessName ?? 'Register'}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {catalogStatsLine}
              <span className="text-gray-400"> · </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {businessLabel}
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-sky-700/25 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-950 dark:text-sky-200">
            Fast lane · scan and weigh
          </span>
        </div>
        <p className="mt-3 rounded-xl border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-xs text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-100">
          Double-check produce codes and weighted items before payment.
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {grid}
        {cart}
        {mobileFab}
        {drawer}
        {modals}
      </div>
    </div>
  )
}

export function CustomPosLayout({
  businessName,
  businessLabel,
  catalogStatsLine,
  grid,
  cart,
  mobileFab,
  drawer,
  modals,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className={`${shellClass()} border-slate-300/80 dark:border-slate-600/50`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
              <LayoutTemplate className="h-3.5 w-3.5" aria-hidden />
              Your workspace
            </p>
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
              {businessName ?? 'Register'}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {catalogStatsLine}
              <span className="text-gray-400"> · </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {businessLabel}
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-slate-400/35 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            Custom profile
          </span>
        </div>
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          This layout follows your onboarding choice; enable modules in Settings
          to match how you run the business.
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {grid}
        {cart}
        {mobileFab}
        {drawer}
        {modals}
      </div>
    </div>
  )
}

export function PharmacyPosLayout({
  businessName,
  businessLabel,
  catalogStatsLine,
  grid,
  cart,
  mobileFab,
  drawer,
  modals,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className={`${shellClass()} border-emerald-200/60 dark:border-emerald-900/40`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
              <Pill className="h-3.5 w-3.5" aria-hidden />
              Pharmacy register
            </p>
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
              {businessName ?? 'Register'}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {catalogStatsLine}
              <span className="text-gray-400"> · </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {businessLabel}
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Rx-aware checkout
          </span>
        </div>
        <p className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          Verify patient ID and Rx details for controlled and prescription lines
          before taking payment.
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {grid}
        {cart}
        {mobileFab}
        {drawer}
        {modals}
      </div>
    </div>
  )
}

export function RestaurantPosLayout({
  businessName,
  businessLabel,
  catalogStatsLine,
  grid,
  cart,
  mobileFab,
  drawer,
  modals,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className={`${shellClass()} border-amber-200/50 dark:border-amber-900/35`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-400">
              <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
              Dining floor
            </p>
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
              {businessName ?? 'Register'}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {catalogStatsLine}
              <span className="text-gray-400"> · </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {businessLabel}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to="/tables"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/20 dark:text-amber-200"
            >
              <Armchair className="h-3.5 w-3.5" aria-hidden />
              Table map
            </Link>
            <span className="rounded-full border border-[var(--brand)]/35 bg-[var(--brand)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              {businessLabel}
            </span>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {grid}
        {cart}
        {mobileFab}
        {drawer}
        {modals}
      </div>
    </div>
  )
}

export function SalonPosLayout({
  businessName,
  businessLabel,
  catalogStatsLine,
  appointmentsEnabled,
  grid,
  cart,
  mobileFab,
  drawer,
  modals,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className={`${shellClass()} border-violet-200/60 dark:border-violet-900/40`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-400">
              Front desk
            </p>
            <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
              {businessName ?? 'Register'}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {catalogStatsLine}
              <span className="text-gray-400"> · </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {businessLabel}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {appointmentsEnabled ? (
              <Link
                to="/appointments"
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-600/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-900 transition hover:bg-violet-500/20 dark:text-violet-200"
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Appointments
              </Link>
            ) : null}
            <span className="rounded-full border border-[var(--brand)]/35 bg-[var(--brand)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              {businessLabel}
            </span>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {grid}
        {cart}
        {mobileFab}
        {drawer}
        {modals}
      </div>
    </div>
  )
}
