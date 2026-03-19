import { NavLink, useLocation } from 'react-router-dom'
import {
  Users,
  Briefcase,
  MessageSquare,
  LogOut,
  ChevronsUpDown,
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

const PIPELINE_NAV = [
  { title: 'Prospects', url: '/prospects', icon: Users },
  { title: 'Clients', url: '/clients', icon: Briefcase },
]

const SUPPORT_NAV = [
  { title: 'Feedback', url: '/feedback', icon: MessageSquare },
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

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, profile, signOut } = useAuth()

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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shrink-0 text-sm">
                T
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-sm font-semibold truncate">Tercero</span>
                <span className="text-xs text-muted-foreground truncate">Admin</span>
              </div>
              {state === 'expanded' && (
                <div className="ml-auto shrink-0">
                  <SidebarTrigger />
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {state === 'collapsed' && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Expand sidebar" className="justify-center">
                <div className="mt-2">
                  <SidebarTrigger />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          {state === 'expanded' && (
            <SidebarGroupLabel>Pipeline</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {PIPELINE_NAV.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {state === 'expanded' && (
            <SidebarGroupLabel>Support</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {SUPPORT_NAV.map((item) => (
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
