import { useState } from 'react'
import {
  Bug, Lightbulb, AlertTriangle, MoreHorizontal,
  LayoutList, LayoutGrid, Building2, Mail, Calendar, Tag, Layers,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty, EmptyContent, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import CustomTable from '@/components/misc/CustomTable'
import { KpiCard } from '@/components/misc/KpiCard'
import { formatDate } from '@/lib/helper'
import { useFeedback, useUpdateFeedbackStatus, FEEDBACK_STATUSES } from '@/api/feedback'
import { cn } from '@/lib/utils'

// ─── Badges ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  low:      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
}

const STATUS_STYLES = {
  received:    'bg-muted text-muted-foreground',
  open:        'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  resolved:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  closed:      'bg-muted text-muted-foreground',
}

function SeverityBadge({ severity }) {
  if (!severity) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', SEVERITY_STYLES[severity] ?? 'bg-muted text-muted-foreground')}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground')}>
      {status?.replace(/_/g, ' ') ?? '—'}
    </span>
  )
}

// ─── Status menu (shared) ─────────────────────────────────────────────────────

function StatusMenu({ item, onUpdated }) {
  const update = useUpdateFeedbackStatus()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <StatusBadge status={item.status} />
          <span className="text-muted-foreground">Change</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Set status</div>
        <DropdownMenuSeparator />
        {FEEDBACK_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={item.status === s || update.isPending}
            onClick={() => update.mutate({ id: item.id, status: s, admin_notes: item.admin_notes }, { onSuccess: onUpdated })}
            className="capitalize"
          >
            {s.replace(/_/g, ' ')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function DetailField({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 size-7 rounded-md bg-muted flex items-center justify-center">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

function FeedbackSheet({ item, open, onClose }) {
  if (!item) return null
  const isBug = item.type === 'bug_report'

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2 mb-1">
            {isBug
              ? <Bug className="size-4 text-rose-500" />
              : <Lightbulb className="size-4 text-purple-500 dark:text-purple-400" />}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isBug ? 'Bug Report' : 'Suggestion'}
            </span>
            <span className="ml-auto"><StatusBadge status={item.status} /></span>
          </div>
          <SheetTitle className="text-lg font-semibold leading-snug pr-6">
            {item.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Submitted {formatDate(item.created_at, 'MMM d, yyyy · h:mm a')}
          </SheetDescription>
        </SheetHeader>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Reporter */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reporter</p>
            <div className="space-y-2.5">
              <DetailField icon={Building2} label="Agency" value={item.agency_name} />
              <DetailField icon={Mail}     label="Email"  value={item.email} />
              {item.plan_name && (
                <DetailField icon={Layers} label="Plan" value={item.plan_name} />
              )}
            </div>
          </section>

          <Separator className="border-dashed" />

          {/* Bug-specific meta */}
          {isBug && (
            <>
              <section className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
                <div className="flex flex-wrap gap-2">
                  {item.severity && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Severity</span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                  )}
                  {item.feature_area && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Area</span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {item.feature_area}
                      </span>
                    </div>
                  )}
                </div>
              </section>
              <Separator className="border-dashed" />
            </>
          )}

          {/* Suggestion-specific meta */}
          {!isBug && item.category && (
            <>
              <section className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</p>
                <DetailField icon={Tag} label="Category" value={item.category} />
              </section>
              <Separator className="border-dashed" />
            </>
          )}

          {/* Description */}
          {item.description && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </section>
          )}

          {/* Steps to reproduce (bugs) */}
          {isBug && item.steps_to_reproduce && (
            <>
              <Separator className="border-dashed" />
              <section className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Steps to Reproduce</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.steps_to_reproduce}
                </p>
              </section>
            </>
          )}

          {/* Expected benefit (suggestions) */}
          {!isBug && item.expected_benefit && (
            <>
              <Separator className="border-dashed" />
              <section className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Benefit</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.expected_benefit}
                </p>
              </section>
            </>
          )}

          {/* Admin notes */}
          {item.admin_notes && (
            <>
              <Separator className="border-dashed" />
              <section className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Notes</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.admin_notes}
                </p>
              </section>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Update status</span>
          <StatusMenu item={item} onUpdated={onClose} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Agency avatar ────────────────────────────────────────────────────────────

function AgencyAvatar({ name, email, logoUrl }) {
  const initials = (name || email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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

// ─── Card views ───────────────────────────────────────────────────────────────

function FeedbackCard({ item, onClick, badges, metaText, MetaIcon, snippet }) {
  return (
    <div
      onClick={() => onClick(item)}
      className={cn(
        'group cursor-pointer rounded-2xl border bg-card/50 ring-1 ring-border/50 dark:bg-card/20',
        'p-6 flex flex-col gap-5 transition-all duration-200',
        'hover:bg-accent/30 dark:hover:bg-card',
      )}
    >
      {/* Row 1 — badges */}
      <div className="flex items-center flex-wrap gap-1.5">
        {badges}
      </div>

      {/* Row 2 — title */}
      <p className="text-sm font-semibold leading-snug line-clamp-2">
        {item.title}
      </p>

      {/* Row 3 — meta text (area / category) */}
      {metaText && (
        <div className="flex items-center gap-1.5">
          {MetaIcon && <MetaIcon className="size-3 text-muted-foreground shrink-0" />}
          <span className="text-xs text-muted-foreground">{metaText}</span>
        </div>
      )}

      {/* Row 4 — description snippet */}
      {snippet && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {snippet}
        </p>
      )}

      {/* Footer — agency (left) + date (right) */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-dashed border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <AgencyAvatar
            name={item.agency_name}
            email={item.email}
            logoUrl={item.logo_url}
          />
          <p className="text-xs font-medium truncate">
            {item.agency_name || item.email?.split('@')[0] || '—'}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDate(item.created_at, 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  )
}

function BugCard({ item, onClick }) {
  return (
    <FeedbackCard
      item={item}
      onClick={onClick}
      badges={<>
        <StatusBadge status={item.status} />
        <SeverityBadge severity={item.severity} />
      </>}
      metaText={item.feature_area}
      MetaIcon={Layers}
      snippet={item.description || item.steps_to_reproduce}
    />
  )
}

function SuggestionCard({ item, onClick }) {
  return (
    <FeedbackCard
      item={item}
      onClick={onClick}
      badges={<>
        <StatusBadge status={item.status} />
        {item.plan_name && (
          <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 px-2 py-0.5 text-xs font-medium capitalize">
            {item.plan_name}
          </span>
        )}
      </>}
      metaText={item.category}
      MetaIcon={Tag}
      snippet={item.description || item.expected_benefit}
    />
  )
}

// ─── Table columns ────────────────────────────────────────────────────────────

function bugColumns(onOpen) {
  return [
    {
      header: 'Agency',
      width: '200px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.agency_name || '—'}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Title',
      width: '260px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.feature_area && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.feature_area}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Severity',
      width: '100px',
      render: (item) => <SeverityBadge severity={item.severity} />,
    },
    {
      header: 'Status',
      width: '110px',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Reported',
      width: '100px',
      render: (item) => (
        <span className="text-xs text-muted-foreground">{formatDate(item.created_at, 'MMM d, yy')}</span>
      ),
    },
    {
      header: '',
      width: '50px',
      cellClassName: 'text-right',
      render: (item) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => { e.stopPropagation(); onOpen(item) }}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      ),
    },
  ]
}

function suggestionColumns(onOpen) {
  return [
    {
      header: 'Agency',
      width: '200px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.agency_name || '—'}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Title',
      width: '260px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.category && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Benefit',
      width: '220px',
      render: (item) => (
        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
          {item.expected_benefit || '—'}
        </p>
      ),
    },
    {
      header: 'Plan',
      width: '90px',
      render: (item) => (
        <span className="text-xs text-muted-foreground capitalize">{item.plan_name || '—'}</span>
      ),
    },
    {
      header: 'Status',
      width: '110px',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Submitted',
      width: '100px',
      render: (item) => (
        <span className="text-xs text-muted-foreground">{formatDate(item.created_at, 'MMM d, yy')}</span>
      ),
    },
    {
      header: '',
      width: '50px',
      cellClassName: 'text-right',
      render: (item) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => { e.stopPropagation(); onOpen(item) }}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      ),
    },
  ]
}

// ─── View toggle ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'bugs',        label: 'Bug Reports', icon: Bug,       iconClass: 'text-rose-500'                           },
  { key: 'suggestions', label: 'Suggestions', icon: Lightbulb, iconClass: 'text-purple-500 dark:text-purple-400'    },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [activeTab, setActiveTab]   = useState('bugs')
  const [view, setView]             = useState('card')   // 'card' | 'table'
  const [selected, setSelected]     = useState(null)

  const { data: all = [], isLoading } = useFeedback()

  const bugs         = all.filter((f) => f.type === 'bug_report')
  const suggestions  = all.filter((f) => f.type === 'suggestion')
  const openBugs     = bugs.filter((f) => f.status === 'open')
  const criticalBugs = bugs.filter((f) => f.severity === 'critical')

  const bugEmpty = (
    <Empty className="py-20 border border-dashed rounded-2xl bg-muted/5">
      <EmptyContent>
        <EmptyMedia variant="icon"><Bug className="size-6 text-muted-foreground/60" /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="font-normal text-xl">No bug reports</EmptyTitle>
          <EmptyDescription className="font-light">Bug reports submitted by users will appear here.</EmptyDescription>
        </EmptyHeader>
      </EmptyContent>
    </Empty>
  )

  const suggestionEmpty = (
    <Empty className="py-20 border border-dashed rounded-2xl bg-muted/5">
      <EmptyContent>
        <EmptyMedia variant="icon"><Lightbulb className="size-6 text-muted-foreground/60" /></EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="font-normal text-xl">No suggestions yet</EmptyTitle>
          <EmptyDescription className="font-light">Feature suggestions from users will appear here.</EmptyDescription>
        </EmptyHeader>
      </EmptyContent>
    </Empty>
  )

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-light tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground font-light">Bug reports and feature suggestions from users</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Total Bug Reports"
          value={bugs.length}
          icon={<Bug className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
          iconBg="bg-rose-50 dark:bg-rose-500/10"
        />
        <KpiCard
          title="Open Bugs"
          value={openBugs.length}
          icon={<AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400" />}
          iconBg="bg-orange-50 dark:bg-orange-500/10"
          valueClass={openBugs.length > 0 ? 'text-orange-600 dark:text-orange-400' : undefined}
        />
        <KpiCard
          title="Critical"
          value={criticalBugs.length}
          icon={<AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
          iconBg="bg-rose-50 dark:bg-rose-500/10"
          valueClass={criticalBugs.length > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
        <KpiCard
          title="Suggestions"
          value={suggestions.length}
          icon={<Lightbulb className="h-4 w-4 text-purple-500 dark:text-purple-400" />}
          iconBg="bg-purple-50 dark:bg-purple-500/10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b border-border/40">
          <TabsList className="bg-transparent h-auto justify-start rounded-none p-0 gap-8">
            {TABS.map((tab) => {
              const count = tab.key === 'bugs' ? bugs.length : suggestions.length
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className={cn(
                    'relative rounded-none bg-transparent px-0 pb-3 pt-0',
                    'text-[13px] font-medium transition-none shadow-none',
                    'border-b-2 border-transparent text-muted-foreground',
                    'flex-none w-fit gap-2',
                    'data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent',
                    'data-[state=active]:text-black dark:data-[state=active]:text-white',
                    'data-[state=active]:border-black dark:data-[state=active]:border-white',
                    'data-[state=active]:shadow-none data-[state=active]:border-x-0 data-[state=active]:border-t-0',
                    'focus-visible:ring-0',
                  )}
                >
                  <tab.icon className={cn('size-4', tab.iconClass)} />
                  {tab.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 min-w-[20px] text-center">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* View toggle */}
          <div className="flex items-center gap-1 pb-2">
            <Button
              variant={view === 'card' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setView('card')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-8"
              onClick={() => setView('table')}
            >
              <LayoutList className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Bugs tab ── */}
        <TabsContent
          value="bugs"
          className="mt-4 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300"
        >
          {view === 'card' ? (
            bugs.length === 0 ? bugEmpty : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {bugs.map((item) => (
                  <BugCard key={item.id} item={item} onClick={setSelected} />
                ))}
              </div>
            )
          ) : (
            <CustomTable
              columns={bugColumns(setSelected)}
              data={bugs}
              isLoading={isLoading}
              onRowClick={setSelected}
              emptyState={bugEmpty}
            />
          )}
        </TabsContent>

        {/* ── Suggestions tab ── */}
        <TabsContent
          value="suggestions"
          className="mt-4 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300"
        >
          {view === 'card' ? (
            suggestions.length === 0 ? suggestionEmpty : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((item) => (
                  <SuggestionCard key={item.id} item={item} onClick={setSelected} />
                ))}
              </div>
            )
          ) : (
            <CustomTable
              columns={suggestionColumns(setSelected)}
              data={suggestions}
              isLoading={isLoading}
              onRowClick={setSelected}
              emptyState={suggestionEmpty}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail sheet */}
      <FeedbackSheet
        item={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
