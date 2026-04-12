import {
  Armchair,
  BarChart3,
  CalendarDays,
  ChefHat,
  Download,
  Landmark,
  LayoutGrid,
  Package,
  Settings,
  Shield,
  Tags,
  Users,
  UsersRound,
  Warehouse,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getPosExperience } from '../../config/posExperience'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'
import { useUI } from '../../hooks/useUI'

function linkClass({ isActive }) {
  return `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/25'
      : 'text-gray-600 hover:bg-gray-100/90 dark:text-gray-300 dark:hover:bg-gray-800/80'
  }`
}

export function Sidebar() {
  const { tenantConfig } = useTenant()
  const { can } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUI()
  const m = tenantConfig?.modules ?? {}
  const pos = getPosExperience(tenantConfig)

  const items = [
    { to: '/pos', label: 'POS', icon: LayoutGrid, perm: 'pos' },
    { to: '/pos/orders', label: 'Orders', icon: Package, perm: 'view_own_orders' },
    { to: '/products', label: 'Products', icon: Tags, perm: 'catalog' },
    { to: '/products/categories', label: 'Categories', icon: Tags, perm: 'catalog' },
    {
      to: '/inventory',
      label: 'Inventory',
      icon: Warehouse,
      perm: 'inventory',
      when: () => m.inventory,
    },
    { to: '/customers', label: 'Customers', icon: Users, perm: 'customer_lookup' },
    {
      to: '/tables',
      label: 'Table map',
      icon: Armchair,
      perm: 'pos',
      when: () => pos.showTablesNav,
    },
    {
      to: '/appointments',
      label: 'Appointments',
      icon: CalendarDays,
      perm: 'pos',
      when: () => m.appointments,
    },
    {
      to: '/kitchen',
      label: 'Kitchen',
      icon: ChefHat,
      perm: 'pos',
      when: () => pos.showKitchenNav,
    },
    { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'reports' },
    {
      to: '/reports/export',
      label: 'Export',
      icon: Download,
      perm: 'export',
    },
    { to: '/settings', label: 'Settings', icon: Settings, perm: 'settings' },
    {
      to: '/settings/users',
      label: 'Staff users',
      icon: UsersRound,
      perm: 'users',
    },
    {
      to: '/settings/registers',
      label: 'Registers',
      icon: Landmark,
      perm: 'registers',
    },
    {
      to: '/superadmin',
      label: 'Super admin',
      icon: Shield,
      perm: 'superadmin_panel',
    },
  ]

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200/80 bg-[var(--surface-elevated)] shadow-[var(--surface-card-shadow)] transition-transform dark:border-gray-800/80 dark:bg-gray-900 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800/80">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-lg font-black text-white shadow-lg shadow-[var(--brand)]/30">
            S
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-50">
              {tenantConfig?.businessName ?? 'SanPOS'}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Point of sale
            </p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((it) => {
            if (it.when && !it.when()) return null
            if (it.perm && !can(it.perm)) return null
            const Icon = it.icon
            return (
              <NavLink
                key={it.to}
                to={it.to}
                className={linkClass}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false)
                }}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                {it.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </>
  )
}
