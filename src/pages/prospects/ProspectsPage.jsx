import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Upload,
  Users,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import CustomTable from '@/components/misc/CustomTable'
import { ProspectStatusBadge, SourceBadge, PROSPECT_STATUSES, SOURCES, SOURCE_LABELS_MAP } from '@/components/misc/StatusBadge'
import { ProspectDrawer } from '@/components/prospects/ProspectDrawer'
import { formatDate } from '@/lib/helper'
import {
  useProspects,
  useCreateProspect,
  useBulkInsertProspects,
} from '@/api/prospects'

// ─── Add prospect form ────────────────────────────────────────────────────────

const addSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  agency_name: z.string().min(1, 'Agency is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().or(z.literal('')),
  source: z.string().min(1),
})

function AddProspectDialog({ open, onClose }) {
  const createProspect = useCreateProspect()

  const form = useForm({
    resolver: zodResolver(addSchema),
    defaultValues: { name: '', agency_name: '', email: '', phone: '', source: 'manual' },
  })

  async function onSubmit(values) {
    await createProspect.mutateAsync({
      ...values,
      phone: values.phone || null,
    })
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
                  <FormControl><Input placeholder="+1 555 0100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                {createProspect.isPending ? 'Adding...' : 'Add prospect'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CSV Import dialog ────────────────────────────────────────────────────────

const CSV_COLUMN_MAP = {
  name: ['name', 'full name', 'contact name', 'contact'],
  agency_name: ['company', 'agency', 'organization', 'business name', 'business'],
  email: ['email', 'email address'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number'],
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
  const [preview, setPreview] = useState(null) // { rows, skipped, filename }
  const fileRef = useRef(null)
  const bulkInsert = useBulkInsertProspects()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const headerMap = {}
        headers.forEach((h, i) => { headerMap[h.toLowerCase().trim()] = h })

        const mapped = []
        let skipped = 0

        results.data.forEach((row) => {
          const m = mapCsvRow(row, headerMap)
          if (!m.email) { skipped++; return }
          mapped.push({
            name: m.name || m.email.split('@')[0],
            agency_name: m.agency_name || 'Unknown',
            email: m.email,
            phone: m.phone || null,
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
          <DialogDescription>
            Supports Apollo and Google Maps exports. Columns: Name, Agency, Email, Phone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{SOURCE_LABELS_MAP[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">CSV File</label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="cursor-pointer"
            />
          </div>

          {preview && (
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm space-y-1">
              <p className="font-medium">{preview.filename}</p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">{preview.rows.length}</span> prospects ready to import
                {preview.skipped > 0 && (
                  <span className="text-orange-600 dark:text-orange-400">
                    {' '}· {preview.skipped} skipped (missing email)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!preview?.rows.length || bulkInsert.isPending}
          >
            {bulkInsert.isPending ? 'Importing...' : `Import ${preview?.rows.length ?? 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ data = [] }) {
  const stats = [
    {
      label: 'Total',
      value: data.length,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Contacted',
      value: data.filter((p) => p.status === 'contacted').length,
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Demo Scheduled',
      value: data.filter((p) => p.status === 'demo_scheduled').length,
      icon: CalendarClock,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Converted',
      value: data.filter((p) => p.status === 'converted').length,
      icon: CheckCircle2,
      color: 'text-teal-600 dark:text-teal-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
          <div className={`rounded-lg bg-muted p-2 shrink-0`}>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState(null)

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
      width: '220px',
      render: (item) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.agency_name}</p>
        </div>
      ),
    },
    {
      header: 'Source',
      width: '130px',
      render: (item) => <SourceBadge source={item.source} />,
    },
    {
      header: 'Status',
      width: '140px',
      render: (item) => <ProspectStatusBadge status={item.status} />,
    },
    {
      header: 'Next Action',
      width: '180px',
      render: (item) => (
        <div className="min-w-0">
          {item.next_action ? (
            <>
              <p className="text-xs truncate">{item.next_action}</p>
              {item.next_action_date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(item.next_action_date, 'MMM d')}
                </p>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Added',
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelected(item) }}>
              Open
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight">
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

      {/* Stats */}
      <StatsBar data={prospects} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, agency, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px]">
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
            <SelectTrigger className="h-9 w-[150px]">
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
        </div>
      </div>

      {/* Table */}
      <CustomTable
        columns={columns}
        data={prospects}
        isLoading={isLoading}
        onRowClick={setSelected}
        emptyState={emptyState}
      />

      {/* Dialogs */}
      <AddProspectDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <ProspectDrawer
        prospect={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
