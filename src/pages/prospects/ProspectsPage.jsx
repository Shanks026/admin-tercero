import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  Plus, Search, Upload, Users, TrendingUp, CalendarClock, CheckCircle2, X,
  LayoutGrid, LayoutList, User, ArrowUpRight,
  Mail, Phone, MessageCircle, Instagram,
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
import CustomTable from '@/components/misc/CustomTable'
import {
  ProspectStatusBadge, SourceBadge, PROSPECT_STATUSES, SOURCES, SOURCE_LABELS_MAP,
} from '@/components/misc/StatusBadge'
import { formatDate } from '@/lib/helper'
import {
  useProspects, useCreateProspect, useBulkInsertProspects,
} from '@/api/prospects'

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
  name:        ['name', 'full name', 'contact name', 'contact'],
  agency_name: ['company', 'agency', 'organization', 'business name', 'business'],
  email:       ['email', 'email address'],
  phone:       ['phone', 'mobile', 'phone number', 'mobile number'],
  website:     ['website', 'website url', 'url', 'web', 'site'],
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
          mapped.push({ name: m.name || m.email.split('@')[0], agency_name: m.agency_name || 'Unknown', email: m.email, phone: m.phone || null, source })
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

// ─── Prospect card (grid view) ────────────────────────────────────────────────

function ProspectCard({ item, onClick }) {
  return (
    <div
      onClick={() => onClick(item)}
      className="cursor-pointer rounded-2xl border bg-card flex flex-col hover:bg-accent/30 transition-colors duration-150 overflow-hidden"
    >
      {/* Badges */}
      <div className="px-6 pt-6 pb-0 flex items-center gap-2 flex-wrap">
        <ProspectStatusBadge status={item.status} />
        {item.source && <SourceBadge source={item.source} />}
      </div>

      {/* Agency + person */}
      <div className="px-6 pt-4 pb-0">
        <p className="text-base font-bold leading-snug line-clamp-2">
          {item.agency_name || item.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <User className="size-3.5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground truncate">{item.name}</p>
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [view, setView] = useState(() => localStorage.getItem('prospects-view') ?? 'grid')

  function handleSetView(v) {
    setView(v)
    localStorage.setItem('prospects-view', v)
  }
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const filters = {
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
  }

  const { data: prospects = [], isLoading } = useProspects(filters)

  const hasFilters = search || statusFilter !== 'all' || sourceFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setSourceFilter('all')
  }

  const columns = [
    {
      header: 'Name & Agency',
      width: '240px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.agency_name}</p>
        </div>
      ),
    },
    {
      header: 'Contact',
      width: '190px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-xs truncate">{item.email}</p>
          {item.phone && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.phone}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Source',
      width: '120px',
      render: (item) => <SourceBadge source={item.source} />,
    },
    {
      header: 'Status',
      width: '140px',
      render: (item) => <ProspectStatusBadge status={item.status} />,
    },
    {
      header: 'Recent Outreach',
      width: '220px',
      render: (item) => item.latest_outreach?.note ? (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {(() => { const ch = CHANNEL_MAP[item.latest_outreach.channel]; const Icon = ch?.icon; return Icon ? <Icon className="size-3 text-muted-foreground shrink-0" /> : null })()}
            <span className="text-xs text-muted-foreground font-medium">{CHANNEL_MAP[item.latest_outreach.channel]?.label || item.latest_outreach.channel}</span>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <p className="text-xs truncate">{item.latest_outreach.note}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(item.latest_outreach.contacted_at, 'MMM d, yy')}
          </p>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      header: 'Website',
      width: '150px',
      render: (item) => item.website ? (
        <span className="text-xs truncate block max-w-32.5">{item.website}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      header: 'Added',
      width: '100px',
      render: (item) => (
        <span className="text-xs text-muted-foreground">{formatDate(item.created_at, 'MMM d, yy')}</span>
      ),
    },
  ]

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
    <div className="p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Prospects
            <span className="text-muted-foreground/50 ml-2 font-extralight">{prospects.length}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-light">Track and manage your lead pipeline</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* KPIs */}
      <StatBar>
        <StatCell
          label="Total"
          value={prospects.length}
          icon={<Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-500/10"
        />
        <StatCell
          label="Contacted"
          value={prospects.filter((p) => p.status === 'contacted').length}
          icon={<TrendingUp className="h-3 w-3 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-100 dark:bg-orange-500/10"
        />
        <StatCell
          label="Demo Scheduled"
          value={prospects.filter((p) => p.status === 'demo_scheduled').length}
          icon={<CalendarClock className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-500/10"
        />
        <StatCell
          label="Converted"
          value={prospects.filter((p) => p.status === 'converted').length}
          icon={<CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-500/10"
        />
      </StatBar>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, agency, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PROSPECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
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
        <CustomTable
          columns={columns}
          data={prospects}
          isLoading={isLoading}
          onRowClick={(item) => navigate(`/prospects/${item.id}`)}
          emptyState={emptyState}
        />
      )}

      {/* Dialogs */}
      <AddProspectDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
