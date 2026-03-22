import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  IndianRupee, Users, TrendingUp, Bug, Lightbulb,
  Zap, Gauge, Sparkles, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { KpiCard } from '@/components/misc/KpiCard'
import { ProspectStatusBadge, SourceBadge } from '@/components/misc/StatusBadge'
import { ProspectDrawer } from '@/components/prospects/ProspectDrawer'
import { useWelcomeGreeting } from '@/components/misc/WelcomeGreeting'
import { useProspects } from '@/api/prospects'
import { useClients, isChurnRisk } from '@/api/clients'
import { useFeedback } from '@/api/feedback'
import { useAuth } from '@/context/AuthContext'
import { daysUntil, formatDate } from '@/lib/helper'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_PRICES = { ignite: 2999, velocity: 8999, quantum: 17999 }

const PLAN_META = [
  { plan: 'ignite',   label: 'Ignite',   icon: Zap,      bar: 'bg-orange-400' },
  { plan: 'velocity', label: 'Velocity', icon: Gauge,    bar: 'bg-blue-500'   },
  { plan: 'quantum',  label: 'Quantum',  icon: Sparkles, bar: 'bg-violet-500' },
  { plan: 'trial',    label: 'Trial',    icon: null,     bar: 'bg-muted-foreground/30' },
]

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

// ─── Action date badge ────────────────────────────────────────────────────────

function ActionBadge({ dateStr }) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  if (days < 0) return (
    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
      Overdue
    </span>
  )
  if (days === 0) return (
    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
      Today
    </span>
  )
  if (days === 1) return (
    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      Tomorrow
    </span>
  )
  return (
    <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      In {days} days
    </span>
  )
}

// ─── Prospect action card (meeting-style) ─────────────────────────────────────

function ProspectCard({ prospect, onClick }) {
  const date = prospect.next_action_date
    ? new Date(prospect.next_action_date)
    : new Date(prospect.created_at)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()

  return (
    <div
      onClick={() => onClick(prospect)}
      className="flex items-center gap-3 py-3 px-3 border-b border-dashed border-border/50 last:border-0 hover:bg-accent/20 cursor-pointer transition-colors duration-150 rounded-lg px-1"
    >
      {/* Date block */}
      <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">
          {month}
        </span>
        <span className="text-sm font-bold text-foreground leading-none mt-1">
          {day}
        </span>
      </div>

      {/* Name + agency */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate leading-tight">{prospect.name}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{prospect.agency_name}</p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ActionBadge dateStr={prospect.next_action_date} />
        <ProspectStatusBadge status={prospect.status} />
      </div>
    </div>
  )
}

// ─── Plan distribution bar ────────────────────────────────────────────────────

function PlanRow({ plan, count, mrr }) {
  const meta = PLAN_META.find((p) => p.plan === plan)

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-dashed border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {meta.icon && <meta.icon className="size-3.5 text-muted-foreground" />}
        <span className="text-sm font-medium">{meta.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">{count} client{count !== 1 ? 's' : ''}</span>
        {mrr > 0 && <span className="font-semibold text-foreground">{formatINR(mrr)}</span>}
      </div>
    </div>
  )
}

// ─── Feedback item ────────────────────────────────────────────────────────────

const STATUS_PILL = {
  received:    'bg-muted text-muted-foreground',
  open:        'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  resolved:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  closed:      'bg-muted text-muted-foreground',
}

function AgencyAvatar({ name, email, logoUrl }) {
  const initials = (name || email || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="size-7 rounded-lg object-cover shrink-0 ring-1 ring-border/40"
        onError={(e) => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 ring-1 ring-border/40">
      <span className="text-[10px] font-semibold text-muted-foreground">{initials}</span>
    </div>
  )
}

function FeedbackItem({ item }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-dashed border-border/50 last:border-0">
      <AgencyAvatar name={item.agency_name} email={item.email} logoUrl={item.logo_url} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-1">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {item.agency_name || item.email?.split('@')[0] || '—'}
        </p>
      </div>
      <span className={cn(
        'shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize',
        STATUS_PILL[item.status] ?? STATUS_PILL.received,
      )}>
        {item.status?.replace(/_/g, ' ')}
      </span>
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ title, subtitle, linkTo, children }) {
  const navigate = useNavigate()
  return (
    <Card className="rounded-2xl border-none gap-0 bg-card/50 ring-1 ring-border/50 dark:bg-card/20 flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {linkTo && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1 h-7 -mr-1 shrink-0"
              onClick={() => navigate(linkTo)}
            >
              View all
              <ChevronRight className="size-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [selectedProspect, setSelectedProspect] = useState(null)

  const { greeting, message } = useWelcomeGreeting()
  const today = new Date()

  const { data: allProspects = [] } = useProspects()
  const { data: clients = [] } = useClients({ superadminId: profile?.id })
  const { data: feedback = [] } = useFeedback()

  // ── KPI derivations ──────────────────────────────────────────────────────
  const paidClients = clients.filter((c) => PLAN_PRICES[c.plan_name])
  const mrr = paidClients.reduce((s, c) => s + (PLAN_PRICES[c.plan_name] || 0), 0)

  const activeProspects = allProspects.filter((p) => !['converted', 'dead'].includes(p.status))
  const openIssues = feedback.filter((f) => ['received', 'open', 'in_progress'].includes(f.status))
  const openBugCount = openIssues.filter((f) => f.type === 'bug_report').length
  const openSuggestionCount = openIssues.filter((f) => f.type === 'suggestion').length
  const criticalBugs = feedback.filter((f) => f.type === 'bug_report' && f.severity === 'critical' && f.status !== 'resolved' && f.status !== 'closed')

  // ── Pipeline: prospects sorted by next action date ───────────────────────
  const pipelineProspects = [...activeProspects]
    .sort((a, b) => {
      if (!a.next_action_date && !b.next_action_date) return 0
      if (!a.next_action_date) return 1
      if (!b.next_action_date) return -1
      return new Date(a.next_action_date) - new Date(b.next_action_date)
    })
    .slice(0, 6)

  // ── Client plan breakdown ─────────────────────────────────────────────────
  const planCounts = PLAN_META.map(({ plan }) => ({
    plan,
    count: clients.filter((c) => c.plan_name === plan).length,
    mrr: (clients.filter((c) => c.plan_name === plan).length) * (PLAN_PRICES[plan] || 0),
  }))
  const churnRisks = clients.filter(isChurnRisk)

  // ── Recent feedback ───────────────────────────────────────────────────────
  const sortedFeedback = [...feedback].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const recentBugs = sortedFeedback.filter((f) => f.type === 'bug_report').slice(0, 5)
  const recentSuggestions = sortedFeedback.filter((f) => f.type === 'suggestion').slice(0, 5)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4 animate-in fade-in duration-500">

      {/* ── Welcome ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-medium tracking-tight text-foreground">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">{message}</p>
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {format(today, 'EEEE, MMMM do')}
        </span>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        <KpiCard
          title="Monthly Recurring Revenue"
          value={formatINR(mrr)}
          sub={`${paidClients.length} paid client${paidClients.length !== 1 ? 's' : ''}`}
          icon={<IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          title="Active Clients"
          value={clients.length}
          sub={churnRisks.length > 0 ? `${churnRisks.length} at churn risk` : 'All healthy'}
          icon={<Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-50 dark:bg-blue-500/10"
          valueClass={churnRisks.length > 0 ? 'text-orange-600 dark:text-orange-400' : undefined}
        />
        <KpiCard
          title="Active Pipeline"
          value={activeProspects.length}
          sub={`${allProspects.filter((p) => p.status === 'new').length} new this cycle`}
          icon={<TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-50 dark:bg-purple-500/10"
        />
        <KpiCard
          title="Open Issues"
          value={openIssues.length}
          sub={
            <span className="flex items-center gap-2 flex-wrap">
              <span>{openBugCount} bug{openBugCount !== 1 ? 's' : ''}</span>
              <span className="text-border">·</span>
              <span>{openSuggestionCount} suggestion{openSuggestionCount !== 1 ? 's' : ''}</span>
              {criticalBugs.length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-rose-500 dark:text-rose-400 font-medium">{criticalBugs.length} critical</span>
                </>
              )}
            </span>
          }
          icon={<Bug className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
          iconBg="bg-rose-50 dark:bg-rose-500/10"
          valueClass={criticalBugs.length > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
      </div>

      {/* ── Row 1: Pipeline | Client Mix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── Pipeline ── */}
        <SectionCard
          title="Pipeline"
          subtitle="Prospects ordered by next action date"
          linkTo="/prospects"
        >
          {pipelineProspects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No active prospects</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pipelineProspects.map((p) => (
                <ProspectCard key={p.id} prospect={p} onClick={setSelectedProspect} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Client Mix ── */}
        <SectionCard
          title="Client Mix"
          subtitle="Plan distribution & health"
          linkTo="/clients"
        >
          <div>
            {planCounts.map(({ plan, count, mrr: planMrr }) => (
              <PlanRow
                key={plan}
                plan={plan}
                count={count}
                mrr={planMrr}
              />
            ))}
          </div>

          {churnRisks.length > 0 && (
            <>
              <Separator className="my-5 border-dashed" />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="size-3 text-orange-500" />
                  Churn Risk
                </p>
                {churnRisks.slice(0, 3).map((c) => (
                  <div
                    key={c.user_id}
                    onClick={() => navigate(`/clients/${c.user_id}`)}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-500/20 dark:bg-orange-500/5 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-500/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.agency_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                      Trial ending
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-dashed">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total MRR</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(mrr)}</span>
            </div>
          </div>
        </SectionCard>

      </div>

      {/* ── Row 2: Feedback ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Bug Reports */}
        <Card className="rounded-2xl border-none gap-0 bg-card/50 ring-1 ring-border/50 dark:bg-card/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bug className="size-4 text-rose-500 shrink-0" />
                <CardTitle className="text-base font-semibold">Bug Reports</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 h-7 -mr-1 shrink-0"
                onClick={() => navigate('/feedback')}
              >
                View all
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentBugs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No bugs reported</p>
            ) : (
              recentBugs.map((item) => <FeedbackItem key={item.id} item={item} />)
            )}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="rounded-2xl border-none gap-0 bg-card/50 ring-1 ring-border/50 dark:bg-card/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-purple-500 dark:text-purple-400 shrink-0" />
                <CardTitle className="text-base font-semibold">Suggestions</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 h-7 -mr-1 shrink-0"
                onClick={() => navigate('/feedback')}
              >
                View all
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentSuggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No suggestions yet</p>
            ) : (
              recentSuggestions.map((item) => <FeedbackItem key={item.id} item={item} />)
            )}
          </CardContent>
        </Card>

      </div>

      {/* Prospect detail drawer */}
      <ProspectDrawer
        prospect={selectedProspect}
        open={!!selectedProspect}
        onClose={() => setSelectedProspect(null)}
      />

    </div>
  )
}
