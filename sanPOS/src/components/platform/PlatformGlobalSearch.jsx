import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPlatformTenantRows } from '../../utils/platformData'

export function PlatformGlobalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return listPlatformTenantRows().filter(
      (t) =>
        t.tenantId.toLowerCase().includes(needle) ||
        String(t.businessName || '').toLowerCase().includes(needle),
    )
  }, [q])

  function goTenant(id) {
    setQ('')
    setOpen(false)
    navigate(`/platform/tenants/${id}`)
  }

  return (
    <div className="relative min-w-0 flex-1 basis-full md:basis-auto">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Jump to workspace… (slug or name)"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          aria-label="Search workspaces"
        />
      </div>
      {open && matches.length > 0 ? (
        <ul
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          role="listbox"
        >
          {matches.slice(0, 8).map((t) => (
            <li key={t.tenantId}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goTenant(t.tenantId)}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{t.businessName}</span>
                <span className="font-mono text-xs text-gray-500">{t.tenantId}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
