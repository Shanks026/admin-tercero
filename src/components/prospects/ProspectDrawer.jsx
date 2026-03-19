import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
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
import { MessageCircle, Phone, Mail, Users, Instagram, Trash2, Plus, Calendar } from 'lucide-react'
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
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Outreach Log</h3>

      {/* Add entry form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 rounded-lg border p-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Channel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHANNEL_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
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
                  <FormLabel className="text-xs">Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" className="h-8 text-xs" {...field} />
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
                <FormLabel className="text-xs">Note (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What happened..."
                    rows={2}
                    className="resize-none text-xs"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" className="h-7 text-xs gap-1" disabled={addEntry.isPending}>
            <Plus className="size-3" />
            Log outreach
          </Button>
        </form>
      </Form>

      {/* Log entries */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : log.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No outreach logged yet.</p>
        ) : (
          log.map((entry) => (
            <div key={entry.id} className="flex gap-3 rounded-md border p-3 bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{CHANNEL_LABELS[entry.channel] || entry.channel}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(entry.contacted_at)}</span>
                </div>
                {entry.note && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{entry.note}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

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

  async function handleDelete() {
    await deleteProspect.mutateAsync(prospect.id)
    setDeleteOpen(false)
    onClose()
  }

  if (!prospect) return null

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-semibold">{prospect.name}</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {prospect.agency_name}
            </SheetDescription>
            <div className="flex items-center gap-2 pt-1">
              <ProspectStatusBadge status={prospect.status} />
              <SourceBadge source={prospect.source} />
            </div>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Profile section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Profile</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Full Name</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agency_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Agency Name</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email</FormLabel>
                        <FormControl>
                          <Input type="email" className="h-8 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Phone</FormLabel>
                        <FormControl>
                          <Input className="h-8 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Status + Next action */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Status & Next Action</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">
                                {s.replace(/_/g, ' ')}
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
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">
                                {s.replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="next_action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Next Action</FormLabel>
                      <FormControl>
                        <Input className="h-8 text-sm" placeholder="e.g. Follow up after demo" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_action_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Next Action Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-8 text-sm" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          className="resize-none text-sm"
                          placeholder="Any notes about this prospect..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
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
                <Button type="submit" size="sm" disabled={updateProspect.isPending}>
                  {updateProspect.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </div>

              <Separator />

              {/* Outreach log */}
              <OutreachLog prospectId={prospect.id} />

              <div className="text-xs text-muted-foreground pt-2 pb-4">
                Added {formatDate(prospect.created_at)}
              </div>
            </form>
          </Form>
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
              {deleteProspect.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
