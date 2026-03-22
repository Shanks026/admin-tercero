import { useLocation } from 'react-router-dom'
import { ModeToggle } from '@/components/misc/mode-toggle'
import { SidebarTrigger } from '@/components/ui/sidebar'

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/prospects':  'Prospects',
  '/clients':    'Clients',
  '/feedback':   'Feedback',
  '/revenue':    'Revenue',
}

export function AppHeader() {
  const { pathname } = useLocation()
  const base = '/' + pathname.split('/')[1]
  const title = PAGE_TITLES[base] ?? 'Admin'

  return (
    <header className="sticky top-0 z-50 flex shrink-0 h-16 items-center px-4 md:px-8 border-b w-full bg-background/80 backdrop-blur-md">
      <span className="text-sm font-semibold text-foreground">{title}</span>

      <div className="ml-auto flex items-center gap-2">
        <ModeToggle />
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
      </div>
    </header>
  )
}
