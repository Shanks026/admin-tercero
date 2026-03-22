import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ProspectStatusBadge, SourceBadge, PROSPECT_STATUSES, SOURCES } from '@/components/misc/StatusBadge'
import { formatDate, formatRelative } from '@/lib/helper'
import {
  useUpdateProspect,
  useDeleteProspect,
  useOutreachLog,
  useAddOutreachEntry,
} from '@/api/prospects'
import { MessageCircle, Phone, Mail, Users, Instagram, Trash2, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'in_person', label: 'In Person', icon: Users },
]

const STATUS_OPTIONS = PROSPECT_STATUSES
const SOURCE_OPTIONS = SOURCES

const prospectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  agency_name: z.string().min(1, 'Agency name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().or(z.literal('')),
  source: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().optional().or(z.literal('')),
  next_action: z.string().optional().or(z.literal('')),
  next_action_date: z.string().optional().or(z.literal('')),
})

const outreachSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  note: z.string().optional().or(z.literal('')),
  contacted_at: z.string().min(1, 'Date is required'),
})

// ─── Quick status menu ────────────────────────────────────────────────────────

function QuickStatusMenu({ prospect, onStatusChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ProspectStatusBadge status={prospect.status} />
          <ChevronDown className="size-3 text-muted-foreground -ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Change status</div>
        <div className="h-px bg-border my-1" />
        {PROSPECT_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={prospect.status === s}
            onClick={() => onStatusChange(s)}
            className="capitalize gap-2"
          >
            <ProspectStatusBadge status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </p>
  )
}

// ─── Outreach log ─────────────────────────────────────────────────────────────

function OutreachLog({ prospectId }) {
  const { data: log = [], isLoading } = useOutreachLog(prospectId)
  const addEntry = useAddOutreachEntry()

  const form = useForm({
    resolver: zodResolver(outreachSchema),
    defaultValues: {
      channel: '',
      note: '',
      contacted_at: new Date().toISOString().slice(0, 16),
    },
  })

  async function onSubmit(values) {
    await addEntry.mutateAsync({
      prospect_id: prospectId,
      channel: values.channel,
      note: values.note || null,
      contacted_at: new Date(values.contacted_at).toISOString(),
    })
    form.reset({
      channel: '',
      note: '',
      contacted_at: new Date().toISOString().slice(0, 16),
    })
  }

  const CHANNEL_LABELS = Object.fromEntries(CHANNEL_OPTIONS.map((c) => [c.value, c.label]))

  return (
    <div className="space-y-5">
      <SectionLabel>Outreach Log</SectionLabel>

      {/* Add entry form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border bg-muted/20 px-4 py-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHANNEL_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contacted_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What happened…"
                    rows={2}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" size="sm" className="gap-1.5" disabled={addEntry.isPending}>
            <Plus className="size-3.5" />
            Log outreach
          </Button>
        </form>
      </Form>

      {/* Log entries */}
      <div className="space-y-2.5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No outreach logged yet.</p>
        ) : (
          log.map((entry) => (
            <div key={entry.id} className="rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {CHANNEL_LABELS[entry.channel] || entry.channel}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {formatRelative(entry.contacted_at)}
                </span>
              </div>
              {entry.note && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                  {entry.note}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export function ProspectDrawer({ prospect, open, onClose }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const updateProspect = useUpdateProspect()
  const deleteProspect = useDeleteProspect()

  const form = useForm({
    resolver: zodResolver(prospectSchema),
    values: {
      name: prospect?.name || '',
      agency_name: prospect?.agency_name || '',
      email: prospect?.email || '',
      phone: prospect?.phone || '',
      source: prospect?.source || 'manual',
      status: prospect?.status || 'new',
      notes: prospect?.notes || '',
      next_action: prospect?.next_action || '',
      next_action_date: prospect?.next_action_date
        ? new Date(prospect.next_action_date).toISOString().slice(0, 10)
        : '',
    },
  })

  async function onSubmit(values) {
    await updateProspect.mutateAsync({
      id: prospect.id,
      ...values,
      phone: values.phone || null,
      notes: values.notes || null,
      next_action: values.next_action || null,
      next_action_date: values.next_action_date
        ? new Date(values.next_action_date).toISOString()
        : null,
    })
  }

  async function handleStatusChange(newStatus) {
    await updateProspect.mutateAsync({ id: prospect.id, status: newStatus })
    form.setValue('status', newStatus)
  }

  async function handleDelete() {
    await deleteProspect.mutateAsync(prospect.id)
    setDeleteOpen(false)
    onClose()
  }

  if (!prospect) return null

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden"
        >
          {/* ── Header ── */}
          <SheetHeader className="px-6 pt-6 pb-5 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-lg font-semibold leading-snug">
                  {prospect.name}
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                  {prospect.agency_name}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <QuickStatusMenu prospect={prospect} onStatusChange={handleStatusChange} />
              <SourceBadge source={prospect.source} />
            </div>
          </SheetHeader>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="prospect-form" className="space-y-8">

                {/* Profile */}
                <section className="space-y-4">
                  <SectionLabel>Profile</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="agency_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agency</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </section>

                <Separator className="border-dashed" />

                {/* Status & Pipeline */}
                <section className="space-y-4">
                  <SectionLabel>Status & Pipeline</SectionLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="source" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="next_action" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Follow up after demo" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="next_action_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          className="resize-none"
                          placeholder="Any notes about this prospect…"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </section>

              </form>
            </Form>

            <Separator className="border-dashed" />

            {/* Outreach log */}
            <OutreachLog prospectId={prospect.id} />

            {/* Added date */}
            <p className="text-xs text-muted-foreground pb-2">
              Added {formatDate(prospect.created_at)}
            </p>
          </div>

          {/* ── Sticky footer ── */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button
              type="submit"
              form="prospect-form"
              size="sm"
              disabled={updateProspect.isPending}
            >
              {updateProspect.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete prospect?</DialogTitle>
            <DialogDescription>
              Remove <span className="font-semibold">{prospect.name}</span> ({prospect.agency_name})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProspect.isPending}>
              {deleteProspect.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
