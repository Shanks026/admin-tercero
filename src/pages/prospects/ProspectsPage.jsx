import { useState, useRef } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  Plus, Search, Upload, Users, TrendingUp, CalendarClock, CheckCircle2, X,
  LayoutGrid, LayoutList, User, ArrowUpRight, Trash2, StickyNote, Pencil, ChevronLeft,
  Mail, Phone, MessageCircle, Instagram, Link2, MapPin, Copy, Check,
} from 'lucide-react'
import { StatBar, StatCell } from '@/components/misc/StatBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Empty, EmptyContent, EmptyMedia, EmptyHeader, EmptyTitle, EmptyDescription,
} from '@/components/ui/empty'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  ProspectStatusBadge, SourceBadge, PROSPECT_STATUSES, SOURCES, SOURCE_LABELS_MAP,
  PROSPECT_STATUS_LABELS_MAP, PROSPECT_STATUS_COLORS,
} from '@/components/misc/StatusBadge'
import { formatDate } from '@/lib/helper'
import { cn } from '@/lib/utils'
import {
  useProspects, useCreateProspect, useBulkInsertProspects, useBulkDeleteProspects,
} from '@/api/prospects'
import {
  useOutreachNotes, useCreateNote, useUpdateNote, useDeleteNote,
} from '@/api/outreachNotes'

// ─── Add Prospect Dialog ──────────────────────────────────────────────────────

const addSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  agency_name: z.string().min(1, 'Agency is required'),
  email:       z.string().email('Invalid email'),
  phone:       z.string().optional().or(z.literal('')),
  website:     z.string().optional().or(z.literal('')),
  source:      z.string().min(1),
})

function AddProspectDialog({ open, onClose }) {
  const createProspect = useCreateProspect()
  const form = useForm({
    resolver: zodResolver(addSchema),
    defaultValues: { name: '', agency_name: '', email: '', phone: '', website: '', source: 'manual' },
  })

  async function onSubmit(values) {
    await createProspect.mutateAsync({ ...values, phone: values.phone || null, website: values.website || null })
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
          <DialogDescription>Add a new lead to your pipeline.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="agency_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Agency Name</FormLabel>
                  <FormControl><Input placeholder="Smith Marketing" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="jane@agency.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="website" render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl><Input placeholder="https://agency.com" {...field} /></FormControl>
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
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{SOURCE_LABELS_MAP[s] || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createProspect.isPending}>
                {createProspect.isPending ? 'Adding…' : 'Add prospect'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CSV Import Dialog ────────────────────────────────────────────────────────

const CSV_COLUMN_MAP = {
  agency_name:             ['agency name', 'company', 'agency', 'organization', 'business name', 'business'],
  website:                 ['website', 'website url', 'url', 'web', 'site'],
  location:                ['location', 'city', 'address'],
  agency_size:             ['agency size', 'size', 'company size', 'team size'],
  years_in_business:       ['years in business', 'years', 'founded', 'established'],
  name:                    ['contact name', 'name', 'full name', 'contact'],
  contact_title:           ['contact title', 'title', 'position', 'role', 'job title'],
  email:                   ['email', 'email address'],
  phone:                   ['phone', 'mobile', 'phone number', 'mobile number'],
  linkedin_url:            ['linkedin url', 'linkedin', 'linkedin profile'],
  services_offered:        ['services offered', 'services', 'service'],
  estimated_client_count:  ['estimated client count', 'client count', 'clients', 'number of clients'],
  industries_served:       ['industries served', 'industries', 'industry', 'niche'],
  lead_score:              ['lead score', 'score'],
  fit_reason:              ['fit reason', 'fit', 'reason'],
  status:                  ['status'],
}

function mapCsvRow(row, headerMap) {
  const result = {}
  for (const [field, aliases] of Object.entries(CSV_COLUMN_MAP)) {
    for (const alias of aliases) {
      const key = headerMap[alias]
      if (key !== undefined && row[key] !== undefined) {
        result[field] = String(row[key]).trim()
        break
      }
    }
  }
  return result
}

function parseLeadScore(val) {
  if (!val) return null
  const n = parseInt(val, 10)
  if (!isNaN(n)) return n
  return { high: 80, medium: 50, low: 20 }[val.toLowerCase()] ?? null
}

function CsvImportDialog({ open, onClose }) {
  const [source, setSource] = useState('manual')
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const bulkInsert = useBulkInsertProspects()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headerMap = {}
        ;(results.meta.fields || []).forEach((h) => { headerMap[h.toLowerCase().trim()] = h })
        const mapped = []
        let skipped = 0
        results.data.forEach((row) => {
          const m = mapCsvRow(row, headerMap)
          if (!m.email) { skipped++; return }
          mapped.push({
            name:                    m.name || m.email.split('@')[0],
            agency_name:             m.agency_name || 'Unknown',
            email:                   m.email,
            phone:                   m.phone || null,
            website:                 m.website || null,
            location:                m.location || null,
            agency_size:             m.agency_size || null,
            years_in_business:       m.years_in_business || null,
            contact_title:           m.contact_title || null,
            linkedin_url:            m.linkedin_url || null,
            services_offered:        m.services_offered || null,
            estimated_client_count:  m.estimated_client_count || null,
            industries_served:       m.industries_served || null,
            lead_score:              parseLeadScore(m.lead_score),
            fit_reason:              m.fit_reason || null,
            status:                  m.status ? m.status.toLowerCase() : 'new',
            source,
          })
        })
        setPreview({ rows: mapped, skipped, filename: file.name })
      },
      error: () => toast.error('Failed to parse CSV'),
    })
  }

  async function handleImport() {
    if (!preview?.rows.length) return
    await bulkInsert.mutateAsync(preview.rows)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    onClose()
  }

  function handleClose() {
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
          <DialogDescription>Supports Apollo and Google Maps exports. Columns: Name, Agency, Email, Phone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{SOURCE_LABELS_MAP[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">CSV File</label>
            <Input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="cursor-pointer" />
          </div>
          {preview && (
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm space-y-1">
              <p className="font-medium">{preview.filename}</p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">{preview.rows.length}</span> prospects ready to import
                {preview.skipped > 0 && (
                  <span className="text-orange-600 dark:text-orange-400"> · {preview.skipped} skipped (missing email)</span>
                )}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview?.rows.length || bulkInsert.isPending}>
            {bulkInsert.isPending ? 'Importing…' : `Import ${preview?.rows.length ?? 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Channel map (matches ProspectDetailPage) ─────────────────────────────────

const CHANNEL_OPTIONS = [
  { value: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'email',     label: 'Email',     icon: Mail },
  { value: 'call',      label: 'Call',      icon: Phone },
  { value: 'in_person', label: 'In Person', icon: Users },
]
const CHANNEL_MAP = Object.fromEntries(CHANNEL_OPTIONS.map((c) => [c.value, c]))

// ─── TanStack column definitions ─────────────────────────────────────────────

const PROSPECT_COLUMNS = [
  {
    id: 'select',
    size: 48,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
  },
  {
    id: 'name',
    size: 240,
    header: 'Name & Agency',
    cell: ({ row: { original: p } }) => (
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{p.agency_name}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.name}</p>
      </div>
    ),
  },
  {
    id: 'contact',
    size: 190,
    header: 'Contact',
    cell: ({ row: { original: p } }) => (
      <div className="min-w-0">
        <p className="text-xs truncate">{p.email}</p>
        {p.phone && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.phone}</p>}
      </div>
    ),
  },
  {
    id: 'source',
    size: 130,
    header: 'Source',
    cell: ({ row: { original: p } }) => <SourceBadge source={p.source} />,
  },
  {
    id: 'status',
    size: 160,
    header: 'Status',
    cell: ({ row: { original: p } }) => (
      <div className="flex items-center gap-2">
        <ProspectStatusBadge status={p.status} />
        {p.tercero_user_id && (
          <span
            title="Linked to Tercero account"
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400"
          >
            <Link2 className="size-2.5" />
            Linked
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'outreach',
    size: 220,
    header: 'Recent Outreach',
    cell: ({ row: { original: p } }) => p.latest_outreach?.note ? (
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {(() => {
            const ch = CHANNEL_MAP[p.latest_outreach.channel]
            const Icon = ch?.icon
            return Icon ? <Icon className="size-3 text-muted-foreground shrink-0" /> : null
          })()}
          <span className="text-xs text-muted-foreground font-medium">
            {CHANNEL_MAP[p.latest_outreach.channel]?.label || p.latest_outreach.channel}
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <p className="text-xs truncate">{p.latest_outreach.note}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(p.latest_outreach.contacted_at, 'MMM d, yy')}
        </p>
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    ),
  },
  {
    id: 'website',
    size: 150,
    header: 'Website',
    cell: ({ row: { original: p } }) => p.website ? (
      <span className="text-xs truncate block max-w-[130px]">{p.website}</span>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    ),
  },
  {
    id: 'added',
    size: 100,
    header: 'Added',
    cell: ({ row: { original: p } }) => (
      <span className="text-xs text-muted-foreground">{formatDate(p.created_at, 'MMM d, yy')}</span>
    ),
  },
]

// ─── Outreach Notes Sheet ─────────────────────────────────────────────────────

function OutreachNotesSheet({ open, onClose }) {
  const { data: notes = [], isLoading } = useOutreachNotes()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  // mode: 'list' | 'edit'
  const [mode, setMode] = useState('list')
  const [editing, setEditing] = useState(null) // null = new note
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  function copyBody(note, e) {
    e.stopPropagation()
    if (!note.body) return
    navigator.clipboard.writeText(note.body).then(() => {
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function openNew() {
    setEditing(null)
    setTitle('')
    setBody('')
    setMode('edit')
  }

  function openEdit(note) {
    setEditing(note)
    setTitle(note.title)
    setBody(note.body || '')
    setMode('edit')
  }

  function handleBack() {
    setMode('list')
    setEditing(null)
  }

  async function handleSave() {
    if (!title.trim()) return
    if (editing) {
      await updateNote.mutateAsync({ id: editing.id, title: title.trim(), body: body.trim() || null })
    } else {
      await createNote.mutateAsync({ title: title.trim(), body: body.trim() || null })
    }
    setMode('list')
  }

  async function handleDelete(note, e) {
    e.stopPropagation()
    await deleteNote.mutateAsync(note.id)
  }

  const isSaving = createNote.isPending || updateNote.isPending

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setMode('list') } }}>
      <SheetContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">

        {/* Fixed header */}
        <SheetHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-2 pr-8">
            {mode === 'edit' && (
              <Button variant="ghost" size="icon" className="size-8 -ml-1 shrink-0" onClick={handleBack}>
                <ChevronLeft className="size-4" />
              </Button>
            )}
            <SheetTitle className="text-base">
              {mode === 'list' ? 'Outreach Notes' : editing ? 'Edit Note' : 'New Note'}
            </SheetTitle>
            {mode === 'list' && (
              <Button size="sm" className="ml-auto gap-1.5" onClick={openNew}>
                <Plus className="size-3.5" />
                New note
              </Button>
            )}
          </div>
        </SheetHeader>

        {mode === 'list' ? (
          /* List — scrolls independently */
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-4 animate-pulse space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
                <StickyNote className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No notes yet. Create your first outreach template.</p>
                <Button variant="outline" size="sm" onClick={openNew} className="gap-1.5">
                  <Plus className="size-3.5" />
                  New note
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => openEdit(note)}
                    className="group rounded-xl border bg-card p-4 cursor-pointer hover:bg-accent/30 transition-colors duration-150"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold leading-snug">{note.title}</p>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {note.body && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => copyBody(note, e)}
                          >
                            {copiedId === note.id
                              ? <Check className="size-3.5 text-emerald-500" />
                              : <Copy className="size-3.5" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => { e.stopPropagation(); openEdit(note) }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(note, e)}
                          disabled={deleteNote.isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    {note.body && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {note.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Edit form — fixed layout, no sheet-level scroll */
          <>
            <div className="flex-1 flex flex-col gap-5 p-6 overflow-hidden min-h-0">
              {/* Title — fixed height */}
              <div className="space-y-1.5 shrink-0">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g. Instagram DM, Cold Email"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Body — fills remaining space, scrolls internally */}
              <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <label className="text-sm font-medium">Body</label>
                  {body && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1.5 text-xs px-2"
                      onClick={() => {
                        navigator.clipboard.writeText(body).then(() => {
                          setCopiedId('edit')
                          setTimeout(() => setCopiedId(null), 2000)
                        })
                      }}
                    >
                      {copiedId === 'edit'
                        ? <><Check className="size-3 text-emerald-500" /> Copied</>
                        : <><Copy className="size-3" /> Copy</>}
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Write your outreach message here…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="flex-1 resize-none overflow-y-auto font-mono text-sm leading-relaxed"
                />
              </div>
            </div>
            {/* Fixed footer */}
            <SheetFooter className="border-t px-6 py-4">
              <Button variant="ghost" onClick={handleBack}>Cancel</Button>
              <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
                {isSaving ? 'Saving…' : 'Save note'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Prospects data table (list view with row selection) ──────────────────────

function ProspectsDataTable({ data, isLoading, emptyState, onRowClick }) {
  const [rowSelection, setRowSelection] = useState({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const bulkDelete = useBulkDeleteProspects()

  const table = useReactTable({
    data,
    columns: PROSPECT_COLUMNS,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  const selectedIds = Object.keys(rowSelection)
  const selectedCount = selectedIds.length

  function handleBulkDelete() {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setRowSelection({})
        setBulkDeleteOpen(false)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0 animate-pulse">
            <div className="size-4 rounded bg-muted shrink-0" />
            <div className="h-3.5 w-44 rounded bg-muted" />
            <div className="h-3.5 w-28 rounded bg-muted" />
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-3.5 flex-1 rounded bg-muted max-w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) return emptyState

  return (
    <div className="space-y-2">
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-muted/50">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})} className="text-muted-foreground">
            Clear
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Delete {selectedCount}
          </Button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/30">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground tracking-wide"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row.original)}
                className="border-b last:border-0 cursor-pointer hover:bg-accent/30 transition-colors duration-150"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} prospect{selectedCount !== 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedCount} prospect{selectedCount !== 1 ? 's' : ''} and all associated outreach history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
              {bulkDelete.isPending ? 'Deleting…' : `Delete ${selectedCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Prospect card (grid view) ────────────────────────────────────────────────

function scoreColors(score) {
  if (score >= 80) return { arc: 'text-emerald-500 dark:text-emerald-400', label: 'text-emerald-700 dark:text-emerald-400' }
  if (score >= 60) return { arc: 'text-yellow-500 dark:text-yellow-400',   label: 'text-yellow-700 dark:text-yellow-400' }
  if (score >= 30) return { arc: 'text-orange-500 dark:text-orange-400',   label: 'text-orange-700 dark:text-orange-400' }
  return               { arc: 'text-red-500 dark:text-red-400',          label: 'text-red-700 dark:text-red-400' }
}

function ScoreRing({ score }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const c = scoreColors(score)
  return (
    <div className="relative size-10 shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="2.5" stroke="currentColor" className="text-border/60" />
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          strokeWidth="2.5"
          stroke="currentColor"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className={c.arc}
        />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums', c.label)}>
        {score}
      </span>
    </div>
  )
}

function ProspectCard({ item, onClick }) {
  return (
    <div
      onClick={() => onClick(item)}
      className="relative cursor-pointer rounded-2xl border bg-card flex flex-col hover:bg-accent/30 transition-colors duration-150 overflow-hidden"
    >
      {item.lead_score != null && (
        <div className="absolute top-4 right-4">
          <ScoreRing score={item.lead_score} />
        </div>
      )}

      {/* Badges */}
      <div className={cn('px-6 pt-6 pb-0 flex items-center gap-2 flex-wrap', item.lead_score != null && 'pr-14')}>
        <ProspectStatusBadge status={item.status} />
        {item.source && <SourceBadge source={item.source} />}
        {item.tercero_user_id && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400">
            <Link2 className="size-3" />
            Linked
          </span>
        )}
      </div>

      {/* Agency + person */}
      <div className="px-6 pt-4 pb-0">
        <p className="text-lg font-bold leading-snug line-clamp-2 font-display">
          {item.agency_name || item.name}
        </p>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="size-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground truncate">{item.name}</p>
          </div>
          {item.location && (
            <div className="flex items-center gap-1 shrink-0">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">{item.location}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent outreach */}
      <div className="px-6 pt-4 pb-6">
        {item.latest_outreach?.note ? (
          <>
            <p className="text-xs text-muted-foreground mb-1.5">Recent Outreach</p>
            <div className="flex items-start gap-2">
              {(() => { const ch = CHANNEL_MAP[item.latest_outreach.channel]; const Icon = ch?.icon; return Icon ? <Icon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" /> : null })()}
              <p className="text-sm line-clamp-2 leading-relaxed">{item.latest_outreach.note}</p>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">No outreach logged yet</p>
        )}
      </div>

      {/* Contact row */}
      <div className="border-t border-dashed border-border/50 px-6 py-4 grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <p className="text-xs font-medium truncate">{item.email || '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Phone</p>
          <p className="text-xs font-medium truncate">{item.phone || '—'}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs text-muted-foreground mb-1">Website</p>
          <p className="text-xs font-medium truncate">{item.website || '—'}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-dashed border-border/50 px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Created {formatDate(item.created_at, 'dd MMM, yyyy')}
        </p>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          View Details
          <ArrowUpRight className="size-3" />
        </span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const statusFilter = searchParams.get('status') ?? 'all'
  const sourceFilter = searchParams.get('source') ?? 'all'
  const [view, setView] = useState(() => localStorage.getItem('prospects-view') ?? 'grid')

  function setParam(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value || value === 'all') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }

  function handleSetView(v) {
    setView(v)
    localStorage.setItem('prospects-view', v)
  }
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)

  const baseFilters = {
    search: search || undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
  }

  const { data: allProspects = [], isLoading } = useProspects(baseFilters)

  const prospects = statusFilter === 'all'
    ? allProspects
    : allProspects.filter((p) => p.status === statusFilter)

  const statusCounts = PROSPECT_STATUSES.reduce((acc, s) => {
    acc[s] = allProspects.filter((p) => p.status === s).length
    return acc
  }, {})

  const hasFilters = search || sourceFilter !== 'all'

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  const emptyState = (
    <Empty className="py-20 border border-dashed rounded-2xl bg-muted/5">
      <EmptyContent>
        <EmptyMedia variant="icon">
          <Users className="size-6 text-muted-foreground/60" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="font-normal text-xl">
            {hasFilters ? 'No results found' : 'No prospects yet'}
          </EmptyTitle>
          <EmptyDescription className="font-light">
            {hasFilters
              ? 'Try adjusting your filters or search terms.'
              : 'Add your first lead to get started.'}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <Button variant="link" onClick={clearFilters} className="text-primary font-medium">
            Clear filters
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add prospect
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )

  return (
    <div className="p-4 sm:p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Prospects
            <span className="text-muted-foreground/50 ml-2 font-extralight">{allProspects.length}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-light">Track and manage your lead pipeline</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNotesOpen(true)} className="gap-2">
            <StickyNote className="size-4" />
            Outreach Notes
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button className="gap-2 h-9" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add prospect
          </Button>
        </div>
      </div>

      {/* KPIs — hidden for now */}
      {/* <StatBar>
        <StatCell
          label="Total"
          value={allProspects.length}
          icon={<Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-500/10"
        />
        <StatCell
          label="Contacted"
          value={statusCounts.contacted ?? 0}
          icon={<TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-100 dark:bg-orange-500/10"
        />
        <StatCell
          label="Demo Scheduled"
          value={statusCounts.demo_scheduled ?? 0}
          icon={<CalendarClock className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-500/10"
        />
        <StatCell
          label="Won"
          value={statusCounts.won ?? 0}
          icon={<CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-500/10"
        />
      </StatBar> */}

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setParam('status', v)} className="w-full">
        <TabsList className="bg-transparent h-auto w-full justify-start rounded-none p-0 gap-6 border-b border-border/40 overflow-x-auto">
          <TabsTrigger
            value="all"
            className="relative rounded-none bg-transparent px-0 pb-3 pt-0 text-[13px] font-medium transition-none shadow-none border-b-2 border-transparent text-muted-foreground flex-none w-fit gap-1.5 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:shadow-none data-[state=active]:border-x-0 data-[state=active]:border-t-0 focus-visible:ring-0"
          >
            All
            <span className="inline-flex items-center justify-center rounded-full font-sans font-normal tabular-nums text-xs px-1.5 min-w-[20px] bg-muted text-muted-foreground">
              {allProspects.length}
            </span>
          </TabsTrigger>
          {PROSPECT_STATUSES.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              className="relative rounded-none bg-transparent px-0 pb-3 pt-0 text-[13px] font-medium transition-none shadow-none border-b-2 border-transparent text-muted-foreground flex-none w-fit gap-1.5 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:text-black dark:data-[state=active]:text-white data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:shadow-none data-[state=active]:border-x-0 data-[state=active]:border-t-0 focus-visible:ring-0"
            >
              {PROSPECT_STATUS_LABELS_MAP[s]}
              {statusCounts[s] > 0 && (
                <span className={cn('inline-flex items-center justify-center rounded-full font-sans font-normal tabular-nums text-xs px-1.5 min-w-[20px]', PROSPECT_STATUS_COLORS[s])}>
                  {statusCounts[s]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, agency, email…"
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={sourceFilter} onValueChange={(v) => setParam('source', v)}>
            <SelectTrigger className="h-9 w-37.5">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{SOURCE_LABELS_MAP[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="size-3.5" />
              Clear
            </Button>
          )}
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7"
              onClick={() => handleSetView('table')}
            >
              <LayoutList className="size-3.5" />
            </Button>
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="size-7"
              onClick={() => handleSetView('grid')}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table / Grid */}
      {view === 'grid' ? (
        prospects.length === 0 ? emptyState : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {prospects.map((item) => (
              <ProspectCard key={item.id} item={item} onClick={() => navigate(`/prospects/${item.id}`)} />
            ))}
          </div>
        )
      ) : (
        <ProspectsDataTable
          data={prospects}
          isLoading={isLoading}
          emptyState={emptyState}
          onRowClick={(item) => navigate(`/prospects/${item.id}`)}
        />
      )}

      {/* Dialogs */}
      <AddProspectDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <OutreachNotesSheet open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  )
}
