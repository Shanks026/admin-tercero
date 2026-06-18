import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Pencil, Trash2, Plus, Mail, Phone, CalendarClock,
  MessageCircle, Instagram, Users, User, History,
  Globe, MapPin, Building2, Briefcase, Linkedin, Star, Lightbulb,
  Search, CheckCircle2, ExternalLink, Link2, ArrowRight, Activity, Copy, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import {
  ProspectStatusBadge, SourceBadge, PROSPECT_STATUSES, PROSPECT_STATUS_LABELS_MAP,
  SOURCES, SOURCE_LABELS_MAP,
} from '@/components/misc/StatusBadge'
import { formatDate, formatRelative } from '@/lib/helper'
import {
  useProspect, useUpdateProspect, useDeleteProspect, useOutreachLog, useAddOutreachEntry,
} from '@/api/prospects'
import { useClients, useClientDetail } from '@/api/clients'
import { useAuth } from '@/context/AuthContext'
import { useProspectActivity, useLogActivity } from '@/api/prospectActivity'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_OPTIONS = [
  { value: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'email',     label: 'Email',     icon: Mail },
  { value: 'call',      label: 'Call',      icon: Phone },
  { value: 'in_person', label: 'In Person', icon: Users },
]
const CHANNEL_MAP = Object.fromEntries(CHANNEL_OPTIONS.map((c) => [c.value, c]))

// Solid dot + chip colors per pipeline status (mirrors StatusBadge palette)
const STATUS_DOT = {
  new:            'bg-blue-500',
  contacted:      'bg-orange-500',
  demo_scheduled: 'bg-purple-500',
  demo_done:      'bg-yellow-500',
  trial_started:  'bg-emerald-500',
  won:            'bg-teal-500',
  dead:           'bg-gray-400',
}

const STATUS_CHIP = {
  new:            'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400',
  contacted:      'bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400',
  demo_scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400',
  demo_done:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400',
  trial_started:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
  won:            'bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-400',
  dead:           'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
}

// ─── Status quick-update select (colored to match status) ───────────────────────

function StatusSelect({ prospect, onWon, onDead }) {
  const update = useUpdateProspect()
  const logActivity = useLogActivity()
  return (
    <Select
      value={prospect.status}
      onValueChange={(status) => {
        if (status === prospect.status) return
        if (status === 'won') { onWon(); return }
        if (status === 'dead') { onDead(); return }
        update.mutate(
          { id: prospect.id, status },
          {
            onSuccess: () => logActivity.mutate({
              prospectId: prospect.id,
              fromStatus: prospect.status,
              toStatus: status,
            }),
          }
        )
      }}
    >
      <SelectTrigger
        className={cn(
          'h-8! w-auto gap-2 border-transparent text-xs font-medium capitalize shadow-none focus-visible:ring-0',
          STATUS_CHIP[prospect.status],
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full shrink-0', STATUS_DOT[prospect.status])} />
          {PROSPECT_STATUS_LABELS_MAP[prospect.status] || prospect.status}
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {PROSPECT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full shrink-0', STATUS_DOT[s])} />
              {PROSPECT_STATUS_LABELS_MAP[s] || s}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function SectionLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {children}
      </p>
      {action}
    </div>
  )
}

function Field({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-right min-w-0 truncate">
        {value || <span className="text-muted-foreground/50 font-normal">—</span>}
      </span>
    </div>
  )
}

// ─── Copy Contact Button ──────────────────────────────────────────────────────

function CopyContactButton({ prospect }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const fields = [
      ['Name',     prospect.name],
      ['Title',    prospect.contact_title],
      ['Email',    prospect.email],
      ['Phone',    prospect.phone],
      ['LinkedIn', prospect.linkedin_url],
      ['Agency',   prospect.agency_name],
      ['Website',  prospect.website],
      ['Location', prospect.location],
    ]
    const text = fields
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

// ─── Edit Contact Dialog ──────────────────────────────────────────────────────

const opt = z.string().optional().or(z.literal(''))

const contactSchema = z.object({
  name:                    z.string().min(1, 'Name is required'),
  agency_name:             z.string().min(1, 'Agency is required'),
  email:                   z.string().email('Invalid email'),
  phone:                   opt,
  website:                 opt,
  source:                  z.string().min(1),
  contact_title:           opt,
  location:                opt,
  agency_size:             opt,
  years_in_business:       opt,
  linkedin_url:            opt,
  services_offered:        opt,
  estimated_client_count:  opt,
  industries_served:       opt,
  lead_score:              z.coerce.number().int().min(0).max(100).optional().or(z.literal('')),
  fit_reason:              opt,
})

const nullIfEmpty = (v) => v || null

function EditContactDialog({ prospect, open, onClose }) {
  const update = useUpdateProspect()
  const form = useForm({
    resolver: zodResolver(contactSchema),
    values: {
      name:                   prospect?.name || '',
      agency_name:            prospect?.agency_name || '',
      email:                  prospect?.email || '',
      phone:                  prospect?.phone || '',
      website:                prospect?.website || '',
      source:                 prospect?.source || 'manual',
      contact_title:          prospect?.contact_title || '',
      location:               prospect?.location || '',
      agency_size:            prospect?.agency_size || '',
      years_in_business:      prospect?.years_in_business || '',
      linkedin_url:           prospect?.linkedin_url || '',
      services_offered:       prospect?.services_offered || '',
      estimated_client_count: prospect?.estimated_client_count || '',
      industries_served:      prospect?.industries_served || '',
      lead_score:             prospect?.lead_score ?? '',
      fit_reason:             prospect?.fit_reason || '',
    },
  })

  async function onSubmit(values) {
    await update.mutateAsync({
      id: prospect.id,
      ...values,
      phone:                  nullIfEmpty(values.phone),
      website:                nullIfEmpty(values.website),
      contact_title:          nullIfEmpty(values.contact_title),
      location:               nullIfEmpty(values.location),
      agency_size:            nullIfEmpty(values.agency_size),
      years_in_business:      nullIfEmpty(values.years_in_business),
      linkedin_url:           nullIfEmpty(values.linkedin_url),
      services_offered:       nullIfEmpty(values.services_offered),
      estimated_client_count: nullIfEmpty(values.estimated_client_count),
      industries_served:      nullIfEmpty(values.industries_served),
      lead_score:             values.lead_score === '' ? null : Number(values.lead_score),
      fit_reason:             nullIfEmpty(values.fit_reason),
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit prospect</DialogTitle>
          <DialogDescription>Update contact, agency, and lead details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Contact</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_title" render={({ field }) => (
                  <FormItem><FormLabel>Title / Role</FormLabel><FormControl><Input placeholder="e.g. Founder" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="linkedin_url" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>LinkedIn URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Agency */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Agency</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="agency_name" render={({ field }) => (
                  <FormItem><FormLabel>Agency Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://agency.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g. Mumbai, India" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="agency_size" render={({ field }) => (
                  <FormItem><FormLabel>Agency Size</FormLabel><FormControl><Input placeholder="e.g. 5–10 people" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="years_in_business" render={({ field }) => (
                  <FormItem><FormLabel>Years in Business</FormLabel><FormControl><Input placeholder="e.g. 3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="estimated_client_count" render={({ field }) => (
                  <FormItem><FormLabel>Est. Client Count</FormLabel><FormControl><Input placeholder="e.g. 20" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="services_offered" render={({ field }) => (
                  <FormItem><FormLabel>Services Offered</FormLabel><FormControl><Input placeholder="e.g. SEO, Social Media" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="industries_served" render={({ field }) => (
                  <FormItem><FormLabel>Industries Served</FormLabel><FormControl><Input placeholder="e.g. F&B, Fashion" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Lead */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Lead</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SOURCES.map((s) => (<SelectItem key={s} value={s}>{SOURCE_LABELS_MAP[s] || s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lead_score" render={({ field }) => (
                  <FormItem><FormLabel>Lead Score (0–100)</FormLabel><FormControl><Input type="number" min={0} max={100} placeholder="e.g. 75" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fit_reason" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Fit Reason</FormLabel><FormControl><Input placeholder="Why is this a good fit?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteProspectDialog({ prospect, open, onClose }) {
  const navigate = useNavigate()
  const del = useDeleteProspect()

  async function handleDelete() {
    await del.mutateAsync(prospect.id)
    onClose()
    navigate('/prospects')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-destructive">
            Delete prospect
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Permanently remove <span className="font-medium text-foreground">{prospect?.name}</span>
          {' '}({prospect?.agency_name}) and their entire outreach history? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={del.isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Conversion Dialog ────────────────────────────────────────────────────────

function ConversionDialog({ prospect, open, onClose }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const update = useUpdateProspect()
  const logActivity = useLogActivity()
  const { data: clients = [] } = useClients({ superadminId: profile?.id })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = clients
    .filter((c) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.agency_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.auth_email?.toLowerCase().includes(q)
      )
    })
    .slice(0, 6)

  async function handleConfirm() {
    const prevStatus = prospect.status
    const updates = { id: prospect.id }
    if (prevStatus !== 'won') updates.status = 'won'
    if (selected) updates.tercero_user_id = selected.user_id
    await update.mutateAsync(updates)
    if (prevStatus !== 'won') {
      logActivity.mutate({ prospectId: prospect.id, fromStatus: prevStatus, toStatus: 'won' })
    }
    onClose()
    if (selected) navigate(`/clients/${selected.user_id}`)
  }

  async function handleSkip() {
    const prevStatus = prospect.status
    if (prevStatus !== 'won') {
      await update.mutateAsync({ id: prospect.id, status: 'won' })
      logActivity.mutate({ prospectId: prospect.id, fromStatus: prevStatus, toStatus: 'won' })
    }
    handleClose()
  }

  function handleClose() {
    setSearch('')
    setSelected(null)
    onClose()
  }

  const alreadyWon = prospect?.status === 'won'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{alreadyWon ? 'Link to Tercero Account' : 'Deal Won!'}</DialogTitle>
          <DialogDescription>
            {alreadyWon
              ? <>Search for <span className="font-medium text-foreground">{prospect?.agency_name}</span>'s Tercero account below.</>
              : <>Link <span className="font-medium text-foreground">{prospect?.agency_name}</span> to their Tercero account, or skip and link later from the Details tab.</>
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
              autoFocus
            />
          </div>

          {filtered.length > 0 ? (
            <div className="rounded-xl border overflow-hidden divide-y max-h-56 overflow-y-auto">
              {filtered.map((client) => {
                const name = client.agency_name || client.auth_full_name || client.email
                const email = client.email || client.auth_email
                const initials = (name || '?').charAt(0).toUpperCase()
                const isSelected = selected?.user_id === client.user_id
                return (
                  <button
                    key={client.user_id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : client)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-accent/30',
                    )}
                  >
                    <div className="size-8 rounded-lg shrink-0 overflow-hidden bg-muted flex items-center justify-center ring-1 ring-border/40">
                      {client.logo_url ? (
                        <img src={client.logo_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : search ? (
            <p className="text-sm text-muted-foreground text-center py-4">No clients found</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">
              Type to search existing clients{alreadyWon ? '.' : ', or skip to link later.'}
            </p>
          )}
        </div>

        <DialogFooter>
          {!alreadyWon && (
            <Button variant="ghost" onClick={handleSkip} disabled={update.isPending}>
              Skip for now
            </Button>
          )}
          {alreadyWon && (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={update.isPending || (alreadyWon && !selected)}>
            {update.isPending ? 'Saving…' : alreadyWon ? 'Link account' : selected ? 'Link & mark won' : 'Mark as won'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Loss Reason Dialog ───────────────────────────────────────────────────────

function LossReasonDialog({ prospect, open, onClose }) {
  const update = useUpdateProspect()
  const logActivity = useLogActivity()
  const [reason, setReason] = useState('')

  async function handleConfirm() {
    await update.mutateAsync({ id: prospect.id, status: 'dead' })
    logActivity.mutate({
      prospectId: prospect.id,
      fromStatus: prospect.status,
      toStatus: 'dead',
      note: reason || null,
    })
    setReason('')
    onClose()
  }

  function handleClose() {
    setReason('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Why did this deal fall through?</DialogTitle>
          <DialogDescription>
            Optional — helps track where prospects are lost.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="e.g. Price too high, went with a competitor, no response…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="resize-none h-24"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={handleConfirm} disabled={update.isPending}>
            Skip
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Mark as Dead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ prospect }) {
  const { data: activities = [], isLoading } = useProspectActivity(prospect.id)

  if (isLoading) {
    return (
      <div className="space-y-3 pt-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 flex flex-col items-center justify-center text-center gap-2 mt-6">
        <Activity className="size-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        <p className="text-xs text-muted-foreground/60">Status changes will appear here.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-6 pt-6">
      <div className="absolute left-[7px] top-7 bottom-1.5 w-px bg-border" />
      <div className="space-y-4">
        {activities.map((entry) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-6 top-2.5 size-3.5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
              <div className="size-1 rounded-full bg-primary" />
            </div>
            <div className="rounded-xl border bg-card px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProspectStatusBadge status={entry.from_status} />
                  <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                  <ProspectStatusBadge status={entry.to_status} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelative(entry.created_at)}
                </span>
              </div>
              {entry.note && (
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.note}</p>
              )}
              <p className="text-xs text-muted-foreground/60">
                {formatDate(entry.created_at, 'MMM d, yyyy · h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Pipeline (inline editable) ───────────────────────────────────────────────

const pipelineSchema = z.object({
  status:           z.string().min(1),
  next_action:      z.string().optional().or(z.literal('')),
  next_action_date: z.string().optional().or(z.literal('')),
  notes:            z.string().optional().or(z.literal('')),
})

function PipelineForm({ prospect, onDone }) {
  const update = useUpdateProspect()

  const form = useForm({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      status:           prospect.status || 'new',
      next_action:      prospect.next_action || '',
      next_action_date: prospect.next_action_date
        ? new Date(prospect.next_action_date).toISOString().slice(0, 10)
        : '',
      notes: prospect.notes || '',
    },
  })

  async function onSubmit(values) {
    await update.mutateAsync({
      id: prospect.id,
      status:           values.status,
      next_action:      values.next_action || null,
      next_action_date: values.next_action_date
        ? new Date(values.next_action_date).toISOString() : null,
      notes: values.notes || null,
    })
    onDone()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-xl border bg-muted/30 px-4 py-4 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROSPECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="next_action_date" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Next Action Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="next_action" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-muted-foreground">Next Action</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Follow up after demo" {...field} />
            </FormControl>
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-muted-foreground">Notes</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                className="resize-none"
                placeholder="Context, requirements, anything worth remembering…"
                {...field}
              />
            </FormControl>
          </FormItem>
        )} />

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save pipeline'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        </div>
      </form>
    </Form>
  )
}

// ─── Outreach Log ─────────────────────────────────────────────────────────────

const outreachSchema = z.object({
  channel:      z.string().min(1, 'Channel is required'),
  note:         z.string().optional().or(z.literal('')),
  contacted_at: z.string().min(1, 'Date is required'),
})

function OutreachForm({ prospectId, onDone }) {
  const addEntry = useAddOutreachEntry()

  const form = useForm({
    resolver: zodResolver(outreachSchema),
    defaultValues: {
      channel:      '',
      note:         '',
      contacted_at: new Date().toISOString().slice(0, 16),
    },
  })

  async function onSubmit(values) {
    await addEntry.mutateAsync({
      prospect_id:  prospectId,
      channel:      values.channel,
      note:         values.note || null,
      contacted_at: new Date(values.contacted_at).toISOString(),
    })
    onDone()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-xl border bg-muted/30 px-4 py-4 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="channel" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Channel</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contacted_at" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Date & Time</FormLabel>
              <FormControl><Input type="datetime-local" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs text-muted-foreground">
              Note <span className="font-normal">(optional)</span>
            </FormLabel>
            <FormControl>
              <Textarea placeholder="What happened, what was discussed…" rows={2} className="resize-none" {...field} />
            </FormControl>
          </FormItem>
        )} />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={addEntry.isPending}>
            {addEntry.isPending ? 'Saving…' : 'Save entry'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        </div>
      </form>
    </Form>
  )
}

function ActivityPanel({ prospect }) {
  const prospectId = prospect.id
  const { data: log = [], isLoading } = useOutreachLog(prospectId)
  // null | 'outreach' | 'pipeline' — only one form open at a time
  const [activeForm, setActiveForm] = useState(null)

  function toggle(form) {
    setActiveForm((curr) => (curr === form ? null : form))
  }

  return (
    <section className="space-y-5">
      <SectionLabel
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={activeForm === 'pipeline' ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => toggle('pipeline')}
            >
              <Pencil className="size-3.5" />
              Update pipeline
            </Button>
            <Button
              variant={activeForm === 'outreach' ? 'default' : 'outline'}
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => toggle('outreach')}
            >
              <Plus className="size-3.5" />
              Log outreach
            </Button>
          </div>
        }
      >
        Outreach Log
      </SectionLabel>

      {/* Shared form slot — pipeline or outreach, never both */}
      {activeForm === 'pipeline' && (
        <PipelineForm prospect={prospect} onDone={() => setActiveForm(null)} />
      )}
      {activeForm === 'outreach' && (
        <OutreachForm prospectId={prospectId} onDone={() => setActiveForm(null)} />
      )}

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : log.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 flex flex-col items-center justify-center text-center gap-2">
          <History className="size-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No outreach logged yet.</p>
          {activeForm !== 'outreach' && (
            <Button variant="link" size="sm" className="text-primary" onClick={() => setActiveForm('outreach')}>
              Log the first touchpoint
            </Button>
          )}
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" />
          <div className="space-y-4">
            {log.map((entry) => {
              const channel = CHANNEL_MAP[entry.channel]
              const Icon = channel?.icon
              return (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-6 top-0.5 size-3.5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <div className="size-1 rounded-full bg-primary" />
                  </div>
                  <div className="rounded-xl border bg-card px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
                        {channel?.label || entry.channel}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelative(entry.contacted_at)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{entry.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      {formatDate(entry.contacted_at, 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryCell({ label, children }) {
  return (
    <div className="flex-1 shrink-0 min-w-25 px-4 sm:px-5 py-3 sm:py-3.5">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function SummaryBar({ prospect }) {
  const { data: log = [] } = useOutreachLog(prospect.id)
  const lastContact = log[0]?.contacted_at

  return (
    <div className="rounded-xl border flex overflow-x-auto divide-x divide-border">
      <SummaryCell label="Status">
        <ProspectStatusBadge status={prospect.status} />
      </SummaryCell>
      <SummaryCell label="Source">
        <SourceBadge source={prospect.source} />
      </SummaryCell>
      <SummaryCell label="Next Action">
        {prospect.next_action ? (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{prospect.next_action}</p>
            {prospect.next_action_date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(prospect.next_action_date, 'MMM d, yyyy')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50">—</p>
        )}
      </SummaryCell>
      <SummaryCell label="Last Contact">
        <p className="text-sm font-medium">
          {lastContact ? formatRelative(lastContact) : <span className="text-muted-foreground/50 font-normal">Never</span>}
        </p>
      </SummaryCell>
      <SummaryCell label="Touchpoints">
        <p className="text-sm font-medium">{log.length}</p>
      </SummaryCell>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="p-4 sm:p-8 max-w-350 mx-auto space-y-6">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12 gap-y-8 pt-2">
        <div className="space-y-8">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="sm:col-span-2">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TAB_TRIGGER_CLASS = cn(
  'relative rounded-none bg-transparent px-0 pb-3 pt-0',
  'text-[13px] font-medium transition-none shadow-none',
  'border-b-2 border-transparent text-muted-foreground',
  'flex-none w-fit gap-2',
  'data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent',
  'data-[state=active]:text-black dark:data-[state=active]:text-white',
  'data-[state=active]:border-black dark:data-[state=active]:border-white',
  'data-[state=active]:shadow-none data-[state=active]:border-x-0 data-[state=active]:border-t-0',
  'focus-visible:ring-0',
)

export default function ProspectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [conversionOpen, setConversionOpen] = useState(false)
  const [lossOpen, setLossOpen] = useState(false)

  const { data: prospect, isLoading, isError } = useProspect(id)
  const { data: linkedClient } = useClientDetail(prospect?.tercero_user_id)

  if (isLoading) return <PageSkeleton />

  if (isError || !prospect) {
    return (
      <div className="p-4 sm:p-8 max-w-350 mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/prospects')} className="gap-2 -ml-2 mb-6">
          <ArrowLeft className="size-4" /> Back to Prospects
        </Button>
        <p className="text-sm text-destructive">Prospect not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Back + header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/prospects')} className="gap-2 -ml-2 mb-4">
          <ArrowLeft className="size-4" /> Back to Prospects
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl font-bold tracking-tight">{prospect.agency_name}</h1>
              <SourceBadge source={prospect.source} />
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground font-light">
              <User className="size-3.5" />
              {prospect.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <StatusSelect
              prospect={prospect}
              onWon={() => setConversionOpen(true)}
              onDead={() => setLossOpen(true)}
            />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar prospect={prospect} />

      {/* Link hint — shown when won but not yet linked */}
      {prospect.status === 'won' && !prospect.tercero_user_id && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Link2 className="size-4 shrink-0" />
            Not yet linked to a Tercero account.
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 shrink-0" onClick={() => setConversionOpen(true)}>
            Link account
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList className="bg-transparent h-auto w-full justify-start rounded-none p-0 gap-8 border-b border-border/40">
          <TabsTrigger value="details" className={TAB_TRIGGER_CLASS}>Details</TabsTrigger>
          <TabsTrigger value="outreach" className={TAB_TRIGGER_CLASS}>Outreach</TabsTrigger>
        </TabsList>

        {/* ── Details ── */}
        <TabsContent value="details" className="mt-8 outline-none focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10 items-start">

            {/* Left: Contact + Agency */}
            <div className="space-y-8">
              <section className="space-y-5">
                <SectionLabel
                  action={
                    <div className="flex items-center gap-1">
                      <CopyContactButton prospect={prospect} />
                      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs -mr-2" onClick={() => setEditOpen(true)}>
                        <Pencil className="size-3" />
                        Edit
                      </Button>
                    </div>
                  }
                >
                  Contact
                </SectionLabel>
                <div className="space-y-3">
                  <Field label="Name" value={prospect.name} icon={User} />
                  {prospect.contact_title && <Field label="Title" value={prospect.contact_title} icon={Briefcase} />}
                  <Field label="Email" value={prospect.email} icon={Mail} />
                  <Field label="Phone" value={prospect.phone} icon={Phone} />
                  {prospect.linkedin_url && (
                    <div className="flex items-start justify-between gap-4 py-0.5">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Linkedin className="size-3.5" /> LinkedIn
                      </span>
                      <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary truncate">View Profile</a>
                    </div>
                  )}
                  <Field label="Added" value={formatDate(prospect.created_at)} icon={CalendarClock} />
                </div>
              </section>

              <Separator />

              <section className="space-y-5">
                <SectionLabel>Agency</SectionLabel>
                <div className="space-y-3">
                  {prospect.website ? (
                    <div className="flex items-start justify-between gap-4 py-0.5">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Globe className="size-3.5" /> Website
                      </span>
                      <a href={/^https?:\/\//i.test(prospect.website) ? prospect.website : `https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary truncate">{prospect.website.replace(/^https?:\/\//i, '')}</a>
                    </div>
                  ) : <Field label="Website" value={null} icon={Globe} />}
                  {prospect.location && <Field label="Location" value={prospect.location} icon={MapPin} />}
                  {prospect.agency_size && <Field label="Size" value={prospect.agency_size} icon={Building2} />}
                  {prospect.years_in_business && <Field label="Years Active" value={prospect.years_in_business} icon={CalendarClock} />}
                  {prospect.estimated_client_count && <Field label="Est. Clients" value={prospect.estimated_client_count} icon={Users} />}
                  {prospect.services_offered && <Field label="Services" value={prospect.services_offered} icon={Briefcase} />}
                  {prospect.industries_served && <Field label="Industries" value={prospect.industries_served} icon={Building2} />}
                </div>
              </section>
            </div>

            {/* Right: Lead Quality + Linked Client + Notes */}
            <div className="space-y-8">
              <section className="space-y-5">
                <SectionLabel>Lead Quality</SectionLabel>
                <div className="space-y-3">
                  {prospect.lead_score != null ? (
                    <div className="flex items-start justify-between gap-4 py-0.5">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Star className="size-3.5" /> Score
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${prospect.lead_score}%` }} />
                        </div>
                        <span className="text-sm font-medium">{prospect.lead_score}/100</span>
                      </div>
                    </div>
                  ) : <Field label="Score" value={null} icon={Star} />}
                  <Field label="Fit Reason" value={prospect.fit_reason} icon={Lightbulb} />
                </div>
              </section>

              {prospect.status === 'won' && (
                <>
                  <Separator />
                  <section className="space-y-5">
                    <SectionLabel>Linked Client</SectionLabel>
                    {linkedClient ? (
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {linkedClient.subscription.agency_name || linkedClient.subscription.email}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {linkedClient.subscription.plan_name}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-7 shrink-0"
                            onClick={() => navigate(`/clients/${prospect.tercero_user_id}`)}
                          >
                            <ExternalLink className="size-3.5" />
                            View Client
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 w-full"
                        onClick={() => setConversionOpen(true)}
                      >
                        <Link2 className="size-3.5" />
                        Link to Tercero account
                      </Button>
                    )}
                  </section>
                </>
              )}

              <Separator />

              <section className="space-y-3">
                <SectionLabel>Notes</SectionLabel>
                {prospect.notes ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{prospect.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/50">No notes yet.</p>
                )}
              </section>
            </div>
          </div>
        </TabsContent>

        {/* ── Outreach + Activity ── */}
        <TabsContent value="outreach" className="mt-8 outline-none focus-visible:ring-0 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-300">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
            <div className="w-full lg:flex-65 min-w-0">
              <ActivityPanel prospect={prospect} />
            </div>
            <div className="w-full lg:flex-35 min-w-0">
              <ActivityTab prospect={prospect} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditContactDialog prospect={prospect} open={editOpen} onClose={() => setEditOpen(false)} />
      <DeleteProspectDialog prospect={prospect} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <ConversionDialog prospect={prospect} open={conversionOpen} onClose={() => setConversionOpen(false)} />
      <LossReasonDialog prospect={prospect} open={lossOpen} onClose={() => setLossOpen(false)} />
    </div>
  )
}
