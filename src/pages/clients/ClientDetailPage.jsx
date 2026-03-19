import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Mail, Phone, Globe, AlertTriangle,
  HardDrive, Users, Clock, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PlanBadge, ProspectStatusBadge, SourceBadge } from '@/components/misc/StatusBadge'
import { formatDate, formatRelative } from '@/lib/helper'
import { useClientDetail, useClientOutreach, useUpdateClientStatus, isChurnRisk, trialDaysLeft, PLANS } from '@/api/clients'
import { PROSPECT_STATUSES } from '@/components/misc/StatusBadge'
import { cn } from '@/lib/utils'

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp', instagram: 'Instagram',
  email: 'Email', call: 'Call', in_person: 'In Person',
}

function Field({ label, value, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground/60 font-normal">—</span>}</p>
    </div>
  )
}

function ProfileTab({ subscription, prospect }) {
  return (
    <div className="space-y-6 pt-4">
      {/* Subscription profile */}
      <div className="rounded-xl border p-5 space-y-4">
        <h3 className="text-sm font-semibold">Agency Profile</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agency Name" value={subscription.agency_name} />
          <Field label="Email" value={subscription.email} />
          <Field label="Industry" value={subscription.industry} />
          <Field label="Mobile" value={subscription.mobile_number} />
        </div>
        {subscription.description && (
          <div className="space-y-1 pt-1 border-t border-dashed border-border/50">
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm">{subscription.description}</p>
          </div>
        )}
      </div>

      {/* Prospect source info */}
      {prospect && (
        <div className="rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold">Lead Origin</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name" value={prospect.name} />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Source</p>
              <SourceBadge source={prospect.source} />
            </div>
            <Field label="Phone" value={prospect.phone} />
            <Field label="Added" value={formatDate(prospect.created_at)} />
          </div>
          {prospect.notes && (
            <div className="space-y-1 pt-1 border-t border-dashed border-border/50">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm text-muted-foreground">{prospect.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubscriptionTab({ subscription }) {
  const days = trialDaysLeft(subscription.trial_ends_at)
  const risk = isChurnRisk(subscription)
  const storageUsedGb = ((subscription.current_storage_used || 0) / 1e9).toFixed(2)
  const storageMaxGb = subscription.max_storage_bytes ? (subscription.max_storage_bytes / 1e9).toFixed(0) : null
  const storagePct = storageMaxGb
    ? Math.round(((subscription.current_storage_used || 0) / subscription.max_storage_bytes) * 100)
    : 0

  return (
    <div className="space-y-4 pt-4">
      {risk && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/5 px-4 py-3">
          <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-400">
            Trial expires in <span className="font-semibold">{days} day{days !== 1 ? 's' : ''}</span> — no paid plan yet.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Current Plan</p>
          <PlanBadge plan={subscription.plan_name} className="text-sm px-2.5 py-1" />
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Billing Cycle</p>
          <p className="text-sm font-medium capitalize">{subscription.billing_cycle || '—'}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Trial Ends</p>
          <p className={cn('text-sm font-medium', risk && 'text-rose-600 dark:text-rose-400')}>
            {subscription.trial_ends_at ? formatDate(subscription.trial_ends_at) : '—'}
            {days !== null && days >= 0 && (
              <span className="text-xs text-muted-foreground ml-1">({days}d left)</span>
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Max Clients</p>
          <p className="text-sm font-medium">{subscription.max_clients ?? '—'}</p>
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Storage</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {storageUsedGb} GB {storageMaxGb ? `/ ${storageMaxGb} GB` : ''}
          </span>
        </div>
        {storageMaxGb && (
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full', storagePct > 80 ? 'bg-rose-500' : 'bg-primary')}
              style={{ width: `${Math.min(storagePct, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Feature flags */}
      <div className="rounded-xl border p-5 space-y-3">
        <h3 className="text-sm font-semibold">Features</h3>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          {[
            ['Agency Sidebar', subscription.branding_agency_sidebar],
            ['Powered By', subscription.branding_powered_by],
            ['Recurring Invoices', subscription.finance_recurring_invoices],
            ['Subscriptions', subscription.finance_subscriptions],
            ['Accrual Finance', subscription.finance_accrual],
            ['Calendar Export', subscription.calendar_export],
            ['Document Collections', subscription.documents_collections],
            ['Campaigns', subscription.campaigns],
          ].map(([label, enabled]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{label}</span>
              <span className={cn('text-xs font-medium', enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                {enabled ? 'On' : 'Off'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Account created {formatDate(subscription.created_at)}
      </p>
    </div>
  )
}

function OutreachTab({ prospectId }) {
  const { data: log = [], isLoading } = useClientOutreach(prospectId)

  if (!prospectId) {
    return (
      <div className="pt-6 text-sm text-muted-foreground">
        No prospect record linked to this client.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!log.length) {
    return (
      <div className="pt-6 text-sm text-muted-foreground italic">
        No outreach logged for this prospect.
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-4">
      {log.map((entry) => (
        <div key={entry.id} className="rounded-lg border p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{CHANNEL_LABELS[entry.channel] || entry.channel}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatRelative(entry.contacted_at)}</span>
            <span className="text-xs text-muted-foreground ml-auto">{formatDate(entry.contacted_at, 'MMM d, yyyy')}</span>
          </div>
          {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
        </div>
      ))}
    </div>
  )
}

function FeedbackTab() {
  return (
    <div className="pt-6 text-sm text-muted-foreground italic">
      Feedback submissions will appear here after Phase 3 is complete.
    </div>
  )
}

export default function ClientDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const updateStatus = useUpdateClientStatus()

  const { data, isLoading, error } = useClientDetail(userId)

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="gap-2 mb-6">
          <ArrowLeft className="size-4" /> Back to Clients
        </Button>
        <p className="text-sm text-destructive">Failed to load client.</p>
      </div>
    )
  }

  const { subscription, prospect } = data

  const TABS = [
    { key: 'profile', label: 'Profile', icon: Building2 },
    { key: 'subscription', label: 'Subscription', icon: Clock },
    { key: 'outreach', label: 'Outreach History', icon: Users },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  ]

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Back + header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="gap-2 -ml-2 mb-4">
          <ArrowLeft className="size-4" /> Back to Clients
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight">
                {subscription.agency_name || subscription.email}
              </h1>
              <PlanBadge plan={subscription.plan_name} />
              {isChurnRisk(subscription) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 text-xs font-medium">
                  <AlertTriangle className="size-3" /> Churn Risk
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-light">{subscription.email}</p>
          </div>

          {/* Status update (if prospect is linked) */}
          {prospect && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">Pipeline status</span>
              <Select
                value={prospect.status}
                onValueChange={(status) => updateStatus.mutate({ userId, status })}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROSPECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent h-auto w-full justify-start rounded-none p-0 gap-8 border-b border-border/40">
          {TABS.map((tab) => (
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
              <tab.icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-2 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <ProfileTab subscription={subscription} prospect={prospect} />
        </TabsContent>

        <TabsContent value="subscription" className="mt-2 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <SubscriptionTab subscription={subscription} />
        </TabsContent>

        <TabsContent value="outreach" className="mt-2 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <OutreachTab prospectId={prospect?.id} />
        </TabsContent>

        <TabsContent value="feedback" className="mt-2 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <FeedbackTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
