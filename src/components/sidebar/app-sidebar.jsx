import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  MessageSquare,
  LogOut,
  ChevronsUpDown,
  IndianRupee,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Prospects', url: '/prospects', icon: Users },
  { title: 'Clients',   url: '/clients',   icon: Briefcase },
  { title: 'Feedback',  url: '/feedback',  icon: MessageSquare },
  { title: 'Revenue',   url: '/revenue',   icon: IndianRupee },
]

function NavItem({ item }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.url)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
        <NavLink to={item.url}>
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const DEFAULT_ICON = '/TerceroIcon.svg'
const LANDSCAPE_LOGO = '/TerceroLand.svg'

export function AppSidebar() {
  const { state, isMobile } = useSidebar()
  const { user, profile, signOut } = useAuth()
  const isCollapsed = state === 'collapsed' && !isMobile

  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Admin'
  const email = user?.email || ''
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="px-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center">
            <SidebarMenuButton
              size={isCollapsed ? 'default' : 'lg'}
              className={`hover:bg-transparent cursor-default ${isCollapsed ? 'justify-center p-0 w-full' : 'justify-start'}`}
            >
              {/* Logo */}
              <div className={`flex shrink-0 items-center justify-center overflow-hidden ${isCollapsed ? 'size-7' : 'h-9 w-32 ml-[-4px]'}`}>
                <div
                  className={`${isCollapsed ? 'size-5' : 'h-7 w-28'} bg-foreground`}
                  style={{
                    maskImage: `url(${isCollapsed ? DEFAULT_ICON : LANDSCAPE_LOGO})`,
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    maskSize: 'contain',
                    WebkitMaskImage: `url(${isCollapsed ? DEFAULT_ICON : LANDSCAPE_LOGO})`,
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    WebkitMaskSize: 'contain',
                  }}
                />
              </div>
            </SidebarMenuButton>

            {/* Collapse trigger — expanded desktop only */}
            {!isCollapsed && !isMobile && (
              <SidebarTrigger className="ml-auto shrink-0" />
            )}
          </SidebarMenuItem>

          {/* Expand trigger — collapsed desktop only */}
          {isCollapsed && !isMobile && (
            <SidebarMenuItem className="flex justify-center mt-2">
              <SidebarTrigger />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          {state === 'expanded' && (
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Separator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip="Account">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-sm font-medium truncate">{fullName}</span>
                    <span className="text-xs text-muted-foreground truncate">{email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-medium">{fullName}</span>
                    <span className="text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
