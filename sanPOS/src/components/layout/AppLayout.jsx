import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SessionLockOverlay } from './SessionLockOverlay'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  const [contentScrolled, setContentScrolled] = useState(false)

  const handleContentScroll = useCallback((e) => {
    const next = e.currentTarget.scrollTop > 2
    setContentScrolled((prev) => (prev === next ? prev : next))
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-muted)] dark:bg-[var(--surface-muted)]">
      <SessionLockOverlay />
      <Sidebar />
      <div className="hidden w-64 shrink-0 md:block" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <TopBar elevated={contentScrolled} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 md:p-6" onScroll={handleContentScroll}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
