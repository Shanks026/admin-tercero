import { Outlet, useLocation } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import { AppSidebar } from './components/sidebar/app-sidebar'
import { AppHeader } from './AppHeader'
import { AppBody } from './AppBody'
import { useAuth } from '@/context/AuthContext'

export function AppShell() {
  const { user } = useAuth()
  const scrollContainerRef = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div
        ref={scrollContainerRef}
        className="flex flex-1 flex-col w-full h-screen min-w-0 overflow-y-auto overflow-x-hidden relative [scrollbar-gutter:stable]"
      >
        <AppHeader />
        <AppBody>
          <Outlet context={{ user }} />
        </AppBody>
      </div>
    </div>
  )
}
