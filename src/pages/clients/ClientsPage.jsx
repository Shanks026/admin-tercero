import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Search, Users, Clock, CheckCircle2, TrendingUp, X, AlertTriangle,
} from 'lucide-react'
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
import { useClients, isChurnRisk, trialDaysLeft, PLANS } from '@/api/clients'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function StatsBar({ data = [] }) {
  const stats = [
    {
      label: 'Total Clients',
      value: data.length,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Active Trial',
      value: data.filter((c) => c.plan_name === 'trial').length,
      icon: Clock,
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Paid Plans',
      value: data.filter((c) => c.plan_name !== 'trial').length,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Churn Risk',
      value: data.filter(isChurnRisk).length,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2 shrink-0">
            <s.icon className={`size-4 ${s.color}`} />
          </div>
          <div>
            <p className="text-2xl font-light">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

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
      width: '220px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.agency_name || '—'}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.email}</p>
        </div>
      ),
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
        if (!item.max_storage_bytes) return <span className="text-xs text-muted-foreground">—</span>
        const usedGb = ((item.current_storage_used || 0) / 1e9).toFixed(1)
        const maxGb = (item.max_storage_bytes / 1e9).toFixed(0)
        const pct = Math.round(((item.current_storage_used || 0) / item.max_storage_bytes) * 100)
        return (
          <div className="min-w-0">
            <p className="text-xs">{usedGb} / {maxGb} GB</p>
            <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', pct > 80 ? 'bg-rose-500' : 'bg-primary')}
                style={{ width: `${Math.min(pct, 100)}%` }}
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

      <StatsBar data={clients} />

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
