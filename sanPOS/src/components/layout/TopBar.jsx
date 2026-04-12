import { format } from 'date-fns'
import { Menu, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'
import { useUI } from '../../hooks/useUI'
import { getJSON, setJSON } from '../../utils/storage'
import { Avatar } from '../shared/Avatar'
import { Button } from '../shared/Button'

export function TopBar() {
  const { tenantId } = useTenant()
  const { currentUser, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUI()
  const [registerId, setRegisterId] = useState(null)
  const [dark, setDark] = useState(false)

  const themeKey = useMemo(() => {
    if (!tenantId || !currentUser?.id) return null
    return `pos:${tenantId}:${currentUser.id}:theme`
  }, [tenantId, currentUser?.id])

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() =>
      setRegisterId(getJSON(tenantId, 'activeRegisterId', null)),
    )
  }, [tenantId])

  useEffect(() => {
    if (!themeKey) return
    try {
      const v = localStorage.getItem(themeKey)
      const isDark = v === 'dark'
      queueMicrotask(() => {
        setDark(isDark)
        document.documentElement.classList.toggle('dark', isDark)
      })
    } catch {
      /* ignore */
    }
  }, [themeKey])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    if (themeKey) {
      try {
        localStorage.setItem(themeKey, next ? 'dark' : 'light')
      } catch {
        /* ignore */
      }
    }
  }

  function onRegisterChange(e) {
    const id = e.target.value
    setRegisterId(id)
    if (tenantId) setJSON(tenantId, 'activeRegisterId', id)
  }

  const registers = tenantId ? getJSON(tenantId, 'registers', []) : []

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200/80 bg-[var(--surface-elevated)]/95 px-4 shadow-sm backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-900/95">
      <button
        type="button"
        className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex flex-1 items-center justify-between gap-4">
        <p className="hidden text-sm text-gray-500 sm:block dark:text-gray-400">
          {format(new Date(), 'PPpp')}
        </p>
        {registers.length > 0 ? (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="hidden sm:inline">Register</span>
            <select
              className="rounded-xl border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={registerId ?? ''}
              onChange={onRegisterChange}
              aria-label="Active register"
            >
              {registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={currentUser?.name} size="sm" />
            <span className="max-w-[140px] truncate text-sm text-gray-700 dark:text-gray-200">
              {currentUser?.name}
            </span>
          </div>
          <Button type="button" variant="secondary" className="!px-3 !py-2 text-xs" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
