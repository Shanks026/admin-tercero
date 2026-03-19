import { Outlet } from 'react-router-dom'
import { AppSidebar } from './components/sidebar/app-sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-screen min-w-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col w-full min-w-0">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
