import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Search, Users, Clock, CheckCircle2, X, AlertTriangle, User,
} from 'lucide-react'
import { KpiCard } from '@/components/misc/KpiCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Empty, EmptyContent, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription,
} from '@/components/ui/empty'
import CustomTable from '@/components/misc/CustomTable'
import { PlanBadge, ProspectStatusBadge } from '@/components/misc/StatusBadge'
import { formatDate } from '@/lib/helper'
import { useClients, isChurnRisk, trialDaysLeft, PLANS, storageDisplay } from '@/api/clients'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function TrialExpiry({ client }) {
  const days = trialDaysLeft(client.trial_ends_at)
  if (client.plan_name !== 'trial' || days === null) return <span className="text-xs text-muted-foreground">—</span>

  const isRisk = isChurnRisk(client)
  const expired = days < 0

  return (
    <div className={cn('flex items-center gap-1.5', isRisk && 'text-rose-600 dark:text-rose-400')}>
      {isRisk && <AlertTriangle className="size-3.5 shrink-0" />}
      <span className="text-xs font-medium">
        {expired ? 'Expired' : days === 0 ? 'Today' : `${days}d left`}
      </span>
    </div>
  )
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')

  const { data: clients = [], isLoading } = useClients({
    search: search || undefined,
    plan: planFilter,
    superadminId: profile?.id,
  })

  const hasFilters = search || planFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setPlanFilter('all')
  }

  const columns = [
    {
      header: 'Agency',
      width: '240px',
      render: (item) => {
        const hasAgency = item.agency_name || item.email
        const displayName = item.agency_name || item.auth_full_name || '—'
        const displayEmail = item.email || item.auth_email || '—'
        const initials = (displayName !== '—' ? displayName : displayEmail)
          .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
        return (
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar — solid for agency, dashed outline + User icon for profile-only */}
            {hasAgency ? (
              <div className="size-8 rounded-lg shrink-0 overflow-hidden bg-muted flex items-center justify-center ring-1 ring-border/40">
                {item.logo_url ? (
                  <img src={item.logo_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                  <span className="text-[11px] font-semibold text-muted-foreground">{initials}</span>
                )}
              </div>
            ) : (
              <div className="size-8 rounded-lg shrink-0 flex items-center justify-center border border-dashed border-border/60 bg-muted/30">
                <User className="size-3.5 text-muted-foreground/50" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{displayEmail}</p>
            </div>
          </div>
        )
      },
    },
    {
      header: 'Plan',
      width: '110px',
      render: (item) => <PlanBadge plan={item.plan_name} />,
    },
    {
      header: 'Trial Expiry',
      width: '130px',
      render: (item) => <TrialExpiry client={item} />,
    },
    {
      header: 'Storage',
      width: '120px',
      render: (item) => {
        const s = storageDisplay(item.current_storage_used, item.max_storage_bytes, item.plan_name)
        if (!s) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="min-w-0">
            <p className="text-xs">{s.usedLabel} / {s.maxGiB} GB</p>
            <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', s.pct > 80 ? 'bg-rose-500' : 'bg-primary')}
                style={{ width: `${Math.min(s.pct, 100)}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Signed Up',
      width: '110px',
      render: (item) => (
        <span className="text-xs text-muted-foreground">{formatDate(item.created_at, 'MMM d, yy')}</span>
      ),
    },
  ]

  const emptyState = (
    <Empty className="py-20 border border-dashed rounded-2xl bg-muted/5">
      <EmptyContent>
        <EmptyMedia variant="icon">
          <Briefcase className="size-6 text-muted-foreground/60" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="font-normal text-xl">
            {hasFilters ? 'No results found' : 'No clients yet'}
          </EmptyTitle>
          <EmptyDescription className="font-light">
            {hasFilters
              ? 'Try adjusting your filters or search terms.'
              : 'Clients appear here once prospects sign up to Tercero.'}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters && (
          <Button variant="link" onClick={clearFilters} className="text-primary font-medium">
            Clear filters
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight">
            Clients
            <span className="text-muted-foreground/50 ml-2 font-extralight">{clients.length}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-light">Trial users and paying clients</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={clients.length}
          icon={<Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-500/10"
        />
        <KpiCard
          title="Active Trial"
          value={clients.filter((c) => c.plan_name === 'trial').length}
          icon={<Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-100 dark:bg-orange-500/10"
        />
        <KpiCard
          title="Paid Plans"
          value={clients.filter((c) => c.plan_name !== 'trial').length}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-500/10"
        />
        <KpiCard
          title="Churn Risk"
          value={clients.filter(isChurnRisk).length}
          icon={<AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
          iconBg="bg-rose-100 dark:bg-rose-500/10"
          valueClass={clients.filter(isChurnRisk).length > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search agency or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <CustomTable
        columns={columns}
        data={clients}
        isLoading={isLoading}
        onRowClick={(item) => navigate(`/clients/${item.user_id}`)}
        emptyState={emptyState}
      />
    </div>
  )
}
