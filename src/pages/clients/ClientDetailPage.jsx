import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, AlertTriangle,
  Users, Clock, MessageSquare, RefreshCw, Settings2, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { PlanBadge, SourceBadge } from '@/components/misc/StatusBadge'
import { formatDate, formatRelative } from '@/lib/helper'
import {
  useClientDetail, useClientOutreach, useUpdateClientStatus,
  useUpgradePlan, useRenewSubscription, useToggleActive, useManualOverride,
  useDeleteClient, isChurnRisk, trialDaysLeft, PLANS,
} from '@/api/clients'
import { PROSPECT_STATUSES } from '@/components/misc/StatusBadge'
import { cn } from '@/lib/utils'

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp', instagram: 'Instagram',
  email: 'Email', call: 'Call', in_person: 'In Person',
}

const FEATURE_FLAGS = [
  { key: 'branding_agency_sidebar', label: 'Agency Sidebar' },
  { key: 'branding_powered_by', label: 'Powered By' },
  { key: 'finance_recurring_invoices', label: 'Recurring Invoices' },
  { key: 'finance_subscriptions', label: 'Subscriptions' },
  { key: 'finance_accrual', label: 'Accrual Finance' },
  { key: 'calendar_export', label: 'Calendar Export' },
  { key: 'documents_collections', label: 'Document Collections' },
  { key: 'campaigns', label: 'Campaigns' },
]

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}

function Row({ label, value, action }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {typeof value === 'string' || typeof value === 'number'
          ? <span className="text-sm font-medium">{value}</span>
          : value}
        {action}
      </div>
    </div>
  )
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

function ManualOverrideDialog({ subscription, userId, open, onOpenChange }) {
  const override = useManualOverride(userId)
  const [form, setForm] = useState(null)
  const snapshotRef = useRef(subscription)

  useEffect(() => {
    if (!open) return
    const s = snapshotRef.current
    setForm({
      billing_cycle: s.billing_cycle || 'monthly',
      subscription_ends_at: s.subscription_ends_at ? new Date(s.subscription_ends_at).toISOString().slice(0, 10) : '',
      trial_ends_at: s.trial_ends_at ? new Date(s.trial_ends_at).toISOString().slice(0, 10) : '',
      max_clients: s.max_clients ?? '',
      max_storage_gb: s.max_storage_bytes ? Math.round(s.max_storage_bytes / (1024 ** 3)) : '',
      max_team_members: s.max_team_members ?? '',
      proposals_limit: s.proposals_limit ?? '',
      extra_client_price_inr: s.extra_client_price_inr ?? '',
      branding_agency_sidebar: !!s.branding_agency_sidebar,
      branding_powered_by: !!s.branding_powered_by,
      finance_recurring_invoices: !!s.finance_recurring_invoices,
      finance_subscriptions: !!s.finance_subscriptions,
      finance_accrual: !!s.finance_accrual,
      calendar_export: !!s.calendar_export,
      documents_collections: !!s.documents_collections,
      campaigns: !!s.campaigns,
    })
  }, [open])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!form) return
    const fields = {
      billing_cycle: form.billing_cycle || null,
      subscription_ends_at: form.subscription_ends_at
        ? new Date(form.subscription_ends_at).toISOString() : null,
      trial_ends_at: form.trial_ends_at
        ? new Date(form.trial_ends_at).toISOString() : null,
      max_clients: form.max_clients !== '' ? Number(form.max_clients) : null,
      max_storage_bytes: form.max_storage_gb !== '' ? Number(form.max_storage_gb) * (1024 ** 3) : null,
      max_team_members: form.max_team_members !== '' ? Number(form.max_team_members) : null,
      proposals_limit: form.proposals_limit !== '' ? Number(form.proposals_limit) : null,
      extra_client_price_inr: form.extra_client_price_inr !== '' ? Number(form.extra_client_price_inr) : null,
      branding_agency_sidebar: form.branding_agency_sidebar,
      branding_powered_by: form.branding_powered_by,
      finance_recurring_invoices: form.finance_recurring_invoices,
      finance_subscriptions: form.finance_subscriptions,
      finance_accrual: form.finance_accrual,
      calendar_export: form.calendar_export,
      documents_collections: form.documents_collections,
      campaigns: form.campaigns,
    }
    override.mutate(fields, { onSuccess: () => onOpenChange(false) })
  }

  if (!form) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 flex flex-col gap-0 max-h-[85vh] sm:max-w-2xl">

        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold">Edit Fields</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Limits */}
          <section className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Limits</p>
            <div className="grid grid-cols-3 gap-x-5 gap-y-5">
              {[
                { key: 'max_clients',            label: 'Max Clients',       placeholder: '—' },
                { key: 'max_storage_gb',         label: 'Max Storage (GB)',  placeholder: '—' },
                { key: 'max_team_members',       label: 'Team Members',      placeholder: 'Unlimited' },
                { key: 'proposals_limit',        label: 'Proposals',         placeholder: 'Unlimited' },
                { key: 'extra_client_price_inr', label: 'Extra Client (₹)',  placeholder: '—' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    className="h-9 text-sm"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Billing */}
          <section className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Billing</p>
            <div className="grid grid-cols-3 gap-x-5">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Billing Cycle</Label>
                <Select value={form.billing_cycle} onValueChange={(v) => set('billing_cycle', v)}>
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subscription Ends</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.subscription_ends_at}
                  onChange={(e) => set('subscription_ends_at', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Trial Ends</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.trial_ends_at}
                  onChange={(e) => set('trial_ends_at', e.target.value)}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Feature Flags */}
          <section className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Feature Flags</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {FEATURE_FLAGS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <Checkbox
                    id={`flag-${key}`}
                    checked={form[key]}
                    onCheckedChange={(checked) => set(key, !!checked)}
                  />
                  <Label htmlFor={`flag-${key}`} className="text-sm font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </section>

        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={override.isPending}>
            {override.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}

function DeleteClientDialog({ open, onOpenChange, agencyName, userId }) {
  const [typed, setTyped] = useState('')
  const navigate = useNavigate()
  const deleteClient = useDeleteClient()

  function handleDelete() {
    deleteClient.mutate(userId, {
      onSuccess: () => {
        onOpenChange(false)
        navigate('/clients')
      },
    })
  }

  const confirmed = typed === agencyName

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-destructive">
            Delete Client Permanently
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 -mt-1">
          <p className="text-sm text-muted-foreground">
            This will permanently delete <span className="font-medium text-foreground">{agencyName}</span> and all associated data — clients, posts, documents, invoices, meetings, notes, and more. This cannot be undone.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Type <span className="font-medium text-foreground">{agencyName}</span> to confirm
            </Label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={agencyName}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleteClient.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || deleteClient.isPending}
          >
            {deleteClient.isPending ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, isPending, variant = 'default' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <p className="text-sm text-muted-foreground -mt-2">{description}</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Please wait…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SubscriptionTab({ subscription, userId }) {
  const [selectedPlan, setSelectedPlan] = useState(subscription.plan_name)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, title: '', description: '', onConfirm: null, variant: 'default' })

  const upgradePlan = useUpgradePlan(userId)
  const renew = useRenewSubscription(userId)
  const toggleActive = useToggleActive(userId)

  const anyPending = upgradePlan.isPending || renew.isPending || toggleActive.isPending

  function ask(title, description, onConfirm, variant = 'default') {
    setConfirm({ open: true, title, description, onConfirm, variant })
  }

  function closeConfirm() {
    setConfirm(c => ({ ...c, open: false }))
  }

  const days = trialDaysLeft(subscription.trial_ends_at)
  const risk = isChurnRisk(subscription)
  const storageUsed = subscription.current_storage_used || 0
  const storageMax = subscription.max_storage_bytes || 0
  const storageUsedGb = (storageUsed / 1e9).toFixed(1)
  const storageMaxGb = storageMax ? (storageMax / 1e9).toFixed(0) : null
  const storagePct = storageMax ? Math.round((storageUsed / storageMax) * 100) : 0

  return (
    <div className="pt-6 space-y-8">

      {/* ── 2-col grid ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-16 items-start">

        {/* Left: Actions + Features */}
        <div className="space-y-8">

          {/* Actions */}
          <div className="space-y-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Actions</p>
            <div className="space-y-4">
              <Row
                label="Change Plan"
                value={
                  <div className="flex items-center gap-2">
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANS.map((p) => (
                          <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => ask(
                        `Change plan to ${capitalize(selectedPlan)}?`,
                        `This will immediately update all limits and feature flags for the ${capitalize(selectedPlan)} plan.`,
                        () => upgradePlan.mutate(selectedPlan, { onSuccess: closeConfirm }),
                      )}
                      disabled={selectedPlan === subscription.plan_name || upgradePlan.isPending}
                    >
                      {upgradePlan.isPending ? 'Applying…' : 'Apply'}
                    </Button>
                  </div>
                }
              />
              <Row
                label="Manual Override"
                value={
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setOverrideOpen(true)}>
                    <Settings2 className="size-3.5" />
                    Edit Fields
                  </Button>
                }
              />
              <Row
                label={subscription.is_active ? 'Deactivate Account' : 'Activate Account'}
                value={
                  <Button
                    size="sm"
                    variant={subscription.is_active ? 'destructive' : 'outline'}
                    className="h-8"
                    onClick={() => ask(
                      subscription.is_active ? 'Deactivate account?' : 'Activate account?',
                      subscription.is_active
                        ? 'The user will see the subscription ended gate immediately.'
                        : 'The account will be restored and the user can log in normally.',
                      () => toggleActive.mutate(!subscription.is_active, { onSuccess: closeConfirm }),
                      subscription.is_active ? 'destructive' : 'default',
                    )}
                    disabled={toggleActive.isPending}
                  >
                    {toggleActive.isPending ? '…' : subscription.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                }
              />
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Features</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {FEATURE_FLAGS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2.5">
                  <span className={cn(
                    'size-1.5 rounded-full shrink-0 mt-px',
                    subscription[key] ? 'bg-emerald-500' : 'bg-border'
                  )} />
                  <span className={cn('text-sm', subscription[key] ? 'text-foreground' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Billing + Limits */}
        <div className="space-y-8">

          {/* Billing */}
          <div className="space-y-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Billing</p>
            <div className="space-y-4">
              <Row label="Billing Cycle" value={capitalize(subscription.billing_cycle) || '—'} />
              <Row
                label="Subscription Ends"
                value={subscription.subscription_ends_at ? formatDate(subscription.subscription_ends_at) : '—'}
                action={subscription.plan_name !== 'trial' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => ask(
                      'Renew subscription?',
                      `Extends the subscription by ${subscription.billing_cycle === 'yearly' ? '365' : '30'} days from today and ensures the account is active.`,
                      () => renew.mutate(subscription.billing_cycle, { onSuccess: closeConfirm }),
                    )}
                    disabled={renew.isPending}
                  >
                    <RefreshCw className="size-3" />
                    {renew.isPending ? 'Renewing…' : `+${subscription.billing_cycle === 'yearly' ? '365' : '30'}d`}
                  </Button>
                )}
              />
              {subscription.plan_name === 'trial' && subscription.trial_ends_at && (
                <Row
                  label="Trial Ends"
                  value={
                    <span className={cn('text-sm font-medium', risk && 'text-rose-600 dark:text-rose-400')}>
                      {formatDate(subscription.trial_ends_at)}
                      {days !== null && days >= 0 && (
                        <span className="text-xs text-muted-foreground ml-1.5">({days}d left)</span>
                      )}
                    </span>
                  }
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Limits */}
          <div className="space-y-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Limits</p>
            <div className="space-y-4">
              <Row label="Max Clients" value={subscription.max_clients ?? '—'} />
              <Row label="Team Members" value={subscription.max_team_members ?? 'Unlimited'} />
              <Row label="Proposals" value={subscription.proposals_limit ?? 'Unlimited'} />
              {subscription.extra_client_price_inr && (
                <Row label="Extra Client Slot" value={`₹${subscription.extra_client_price_inr}`} />
              )}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm text-muted-foreground">Storage</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {storageUsedGb} GB{storageMaxGb ? ` / ${storageMaxGb} GB` : ''}
                  </span>
                  {storageMaxGb && (
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', storagePct > 80 ? 'bg-rose-500' : 'bg-primary')}
                        style={{ width: `${Math.min(storagePct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Account created {formatDate(subscription.created_at)}
      </p>

      <ManualOverrideDialog
        subscription={subscription}
        userId={userId}
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
      />

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm(c => ({ ...c, open }))}
        title={confirm.title}
        description={confirm.description}
        onConfirm={confirm.onConfirm}
        isPending={anyPending}
        variant={confirm.variant}
      />
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const updateStatus = useUpdateClientStatus()

  const { data, isLoading, error } = useClientDetail(userId)

  if (isLoading) {
    return (
      <div className="p-8 max-w-350 mx-auto space-y-6">
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
      <div className="p-8 max-w-350 mx-auto">
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
    <div className="p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Back + header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="gap-2 -ml-2 mb-4">
          <ArrowLeft className="size-4" /> Back to Clients
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {subscription.agency_name || subscription.email}
              </h1>
              <PlanBadge plan={subscription.plan_name} />
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                subscription.is_active
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
              )}>
                {subscription.is_active ? 'Active' : 'Inactive'}
              </span>
              {isChurnRisk(subscription) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 text-xs font-medium">
                  <AlertTriangle className="size-3" /> Churn Risk
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-light">{subscription.email}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Status update (if prospect is linked) */}
            {prospect && (
              <>
                <span className="text-xs text-muted-foreground">Pipeline status</span>
                <Select
                  value={prospect.status}
                  onValueChange={(status) => updateStatus.mutate({ userId, status })}
                >
                  <SelectTrigger className="h-8 w-40 text-xs">
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
              </>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
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
          <SubscriptionTab subscription={subscription} userId={userId} />
        </TabsContent>

        <TabsContent value="outreach" className="mt-2 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <OutreachTab prospectId={prospect?.id} />
        </TabsContent>

        <TabsContent value="feedback" className="mt-2 focus-visible:ring-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <FeedbackTab />
        </TabsContent>
      </Tabs>

      <DeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        agencyName={subscription.agency_name || subscription.email}
        userId={userId}
      />
    </div>
  )
}
