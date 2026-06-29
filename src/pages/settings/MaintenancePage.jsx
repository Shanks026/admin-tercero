import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const DEFAULT_MESSAGE = "The application is currently undergoing maintenance. We'll be back shortly."

function Toggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={enabled}
      role="switch"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        enabled ? 'bg-red-500' : 'bg-muted-foreground/30'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function formatTimestamp(iso) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function MaintenancePage() {
  // Reflects real DB state — only updated after a confirmed, successful save
  const [isActive, setIsActive] = useState(false)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingActive, setPendingActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('app_config')
      .select('value, updated_at')
      .eq('key', 'maintenance_mode')
      .single()

    if (data) {
      setIsActive(data.value.is_active ?? false)
      setMessage(data.value.message ?? DEFAULT_MESSAGE)
      setUpdatedAt(data.updated_at)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function handleToggleClick() {
    setPendingActive(!isActive)
    setSaveError(null)
    setDialogOpen(true)
  }

  async function handleConfirm() {
    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_TERCERO_SUPABASE_FUNCTIONS_URL}/toggle-maintenance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'x-admin-secret': import.meta.env.VITE_MAINTENANCE_SECRET,
          },
          body: JSON.stringify({ is_active: pendingActive, message }),
        }
      )
      if (!res.ok) throw new Error('Failed to update maintenance mode')

      setIsActive(pendingActive)
      setUpdatedAt(new Date().toISOString())
      setDialogOpen(false)
    } catch (err) {
      setSaveError(err.message)
    }

    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Maintenance Mode</h1>
        <p className="text-sm text-muted-foreground font-light">
          Toggle a downtime banner across the entire Tercero app. Changes apply within 1–2 seconds via Realtime.
        </p>
      </div>

      <Separator />

      {/* Status card */}
      <div className={cn(
        'rounded-xl border p-6 space-y-6 transition-colors',
        isActive ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-card'
      )}>

        {/* Toggle row */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-base font-semibold">Enable Maintenance Mode</Label>
              <span className={cn(
                'flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5',
                isActive
                  ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              )}>
                <span className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  isActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                )} />
                {isActive ? 'Under Maintenance' : 'Application Live'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? 'All users on Tercero are currently seeing the maintenance banner.'
                : 'Tercero is operating normally. No banner is shown to users.'}
            </p>
          </div>
          <Toggle enabled={isActive} onToggle={handleToggleClick} />
        </div>

        <Separator />

        {/* Message editor */}
        <div className="space-y-2">
          <Label htmlFor="maintenance-message">Banner Message</Label>
          <Textarea
            id="maintenance-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder={DEFAULT_MESSAGE}
            className="resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            This message will be shown to users on the maintenance banner. Toggle to apply changes.
          </p>
        </div>

        {/* Last updated */}
        {updatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last updated {formatTimestamp(updatedAt)}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className={cn('h-5 w-5', pendingActive ? 'text-red-500' : 'text-emerald-500')} />
              {pendingActive ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
            </DialogTitle>
            <DialogDescription>
              {pendingActive
                ? 'This will immediately show a maintenance banner to all Tercero users.'
                : 'This will remove the maintenance banner and restore normal access for all users.'}
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className={cn(pendingActive && 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700')}
            >
              {saving ? 'Saving…' : pendingActive ? 'Enable' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
