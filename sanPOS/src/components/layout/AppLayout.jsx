import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--surface-muted)] dark:bg-[var(--surface-muted)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
