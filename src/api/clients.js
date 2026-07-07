import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const KEYS = {
  list: (filters) => ['admin', 'clients', 'list', filters],
  detail: (userId) => ['admin', 'clients', 'detail', userId],
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchClients({ search, plan, superadminId } = {}) {
  const { data, error } = await supabase.rpc('admin_get_clients')
  if (error) throw error

  let results = (data || []).filter(
    (s) => s.user_id !== superadminId && s.auth_email !== 'hello@tercerospace.com'
  )

  if (plan && plan !== 'all') {
    results = results.filter((s) => s.plan_name === plan)
  }

  if (search) {
    const q = search.toLowerCase()
    results = results.filter(
      (s) =>
        s.agency_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.auth_email?.toLowerCase().includes(q) ||
        s.auth_full_name?.toLowerCase().includes(q)
    )
  }

  return results
}

async function fetchClientDetail(userId) {
  const [subResult, prospectResult, authResult] = await Promise.all([
    supabase
      .from('agency_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('admin_prospects')
      .select('*')
      .eq('tercero_user_id', userId)
      .maybeSingle(),
    supabase.rpc('admin_get_user_auth_info', { target_user_id: userId }),
  ])

  if (subResult.error) throw subResult.error
  if (!subResult.data) throw new Error('Client not found')

  // admin_get_user_auth_info returns an array; take the first row.
  const authInfo = authResult.data?.[0] ?? null
  const auth_email = authInfo?.email ?? null
  // NOTE: full_name lives in auth.users.raw_user_meta_data and is NOT among the
  // columns this RPC currently returns — falls back to null until it's added
  // (see hand-off note), then restores with no further client change.
  const auth_full_name = authInfo?.full_name ?? null

  return {
    subscription: {
      ...subResult.data,
      auth_email,
      auth_full_name,
      email: subResult.data.email || auth_email,
    },
    prospect: prospectResult.data ?? null,
  }
}

async function fetchClientOutreach(prospectId) {
  if (!prospectId) return []
  const { data, error } = await supabase
    .from('admin_outreach_log')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('contacted_at', { ascending: false })
  if (error) throw error
  return data
}

// ─── Plan configs ─────────────────────────────────────────────────────────────

export const PLAN_CONFIGS = {
  // Trial mirrors Quantum — full access, time-limited via trial_ends_at (14 days)
  trial: {
    plan_name: 'trial',
    max_clients: null,
    max_storage_bytes: 214_748_364_800,  // 200 GB — the one deliberate trial limit
    max_team_members: null,
    proposals_limit: null,
    extra_client_price_inr: null,
    extra_seat_price_inr: null,
    branding_agency_sidebar: true,
    branding_powered_by: false,
    finance_recurring_invoices: true,
    finance_subscriptions: true,
    finance_accrual: true,
    calendar_export: true,
    documents_collections: true,
    reports: true,
    campaigns: true,
    chat: true,
  },
  ignite: {
    plan_name: 'ignite',
    max_clients: 8,
    max_storage_bytes: 53_687_091_200,   // 50 GB
    max_team_members: 4,
    proposals_limit: 10,
    extra_client_price_inr: 500,
    extra_seat_price_inr: 399,
    branding_agency_sidebar: false,
    branding_powered_by: true,
    finance_recurring_invoices: false,
    finance_subscriptions: false,
    finance_accrual: false,
    calendar_export: false,
    documents_collections: false,
    reports: false,
    campaigns: true,
    chat: false,
  },
  velocity: {
    plan_name: 'velocity',
    max_clients: 20,
    max_storage_bytes: 214_748_364_800,  // 200 GB
    max_team_members: 10,
    proposals_limit: null,
    extra_client_price_inr: 500,
    extra_seat_price_inr: 399,
    branding_agency_sidebar: true,
    branding_powered_by: true,
    finance_recurring_invoices: true,
    finance_subscriptions: true,
    finance_accrual: true,
    calendar_export: true,
    documents_collections: true,
    reports: true,
    campaigns: true,
    chat: true,
  },
  quantum: {
    plan_name: 'quantum',
    max_clients: null,
    max_storage_bytes: 536_870_912_000,  // 500 GB base — adjust per deal
    max_team_members: null,
    proposals_limit: null,
    extra_client_price_inr: null,
    extra_seat_price_inr: null,
    branding_agency_sidebar: true,
    branding_powered_by: false,
    finance_recurring_invoices: true,
    finance_subscriptions: true,
    finance_accrual: true,
    calendar_export: true,
    documents_collections: true,
    reports: true,
    campaigns: true,
    chat: true,
  },
}

// ─── Mutations ────────────────────────────────────────────────────────────────

async function updateClientProspectStatus({ userId, status }) {
  const { error } = await supabase
    .from('admin_prospects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tercero_user_id', userId)
  if (error) throw error
}

// All four subscription writes route through one superadmin-gated RPC,
// admin_update_subscription(target_user_id, patch). The RPC strips protected
// columns (user_id, created_at, current_storage_used, scheduled_for_deletion_at)
// and forces updated_at = now(); every other column in the patch applies as-is.

async function upgradePlan({ userId, plan }) {
  const config = PLAN_CONFIGS[plan]
  if (!config) throw new Error(`Unknown plan: ${plan}`)
  const { error } = await supabase.rpc('admin_update_subscription', {
    target_user_id: userId,
    patch: config,
  })
  if (error) throw error
}

async function renewSubscription({ userId, billingCycle }) {
  const days = billingCycle === 'yearly' ? 365 : 30
  const endsAt = new Date()
  endsAt.setDate(endsAt.getDate() + days)
  const { error } = await supabase.rpc('admin_update_subscription', {
    target_user_id: userId,
    patch: { subscription_ends_at: endsAt.toISOString(), is_active: true },
  })
  if (error) throw error
}

async function toggleActive({ userId, isActive }) {
  const { error } = await supabase.rpc('admin_update_subscription', {
    target_user_id: userId,
    patch: { is_active: isActive },
  })
  if (error) throw error
}

async function manualOverride({ userId, fields }) {
  const { error } = await supabase.rpc('admin_update_subscription', {
    target_user_id: userId,
    patch: fields,
  })
  if (error) throw error
}

// ─── Workspace deletion ─────────────────────────────────────────────────────
//
// Mirrors the main Tercero app's grace-period model. All actual destruction is
// owned by the canonical purgeWorkspace() teardown on the server — this client
// NEVER reimplements a purge and never holds the service-role key.
//
//   • scheduleDeletion  → admin_schedule_workspace_deletion RPC (superadmin-gated,
//                          SECURITY DEFINER). Sets scheduled_for_deletion_at; the
//                          daily pg_cron purge sweeps it up after the window.
//   • cancelDeletion    → admin_cancel_workspace_deletion RPC. Clears the schedule.
//   • purgeImmediately  → delete-workspace edge function. Invoked with the
//                          superadmin's session JWT (attached automatically by
//                          functions.invoke), which the function verifies before
//                          running purgeWorkspace() on the single target workspace.

async function scheduleDeletion({ userId, days = 14 }) {
  const { data, error } = await supabase.rpc('admin_schedule_workspace_deletion', {
    target_user_id: userId,
    days,
  })
  if (error) throw error
  return data // resulting scheduled_for_deletion_at timestamp
}

async function cancelDeletion(userId) {
  const { error } = await supabase.rpc('admin_cancel_workspace_deletion', {
    target_user_id: userId,
  })
  if (error) throw error
}

async function purgeImmediately({ userId, reason }) {
  const { data, error } = await supabase.functions.invoke('delete-workspace', {
    body: { workspace_user_id: userId, reason },
  })
  if (error) {
    // Non-2xx responses arrive as FunctionsHttpError with the body on .context
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* response had no JSON body — fall back to error.message */
    }
    throw new Error(message || 'Failed to delete workspace')
  }
  if (data && data.success === false) {
    throw new Error(data.error || 'Failed to delete workspace')
  }
  return data // { success: true, purged: 1 }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useClients(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => fetchClients(filters),
  })
}

export function useClientDetail(userId) {
  return useQuery({
    queryKey: KEYS.detail(userId),
    queryFn: () => fetchClientDetail(userId),
    enabled: !!userId,
  })
}

export function useClientOutreach(prospectId) {
  return useQuery({
    queryKey: ['admin', 'clients', 'outreach', prospectId],
    queryFn: () => fetchClientOutreach(prospectId),
    enabled: !!prospectId,
  })
}

export function useUpdateClientStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateClientProspectStatus,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] })
      qc.invalidateQueries({ queryKey: ['admin', 'prospects'] })
      toast.success('Status updated')
    },
    onError: (e) => toast.error(e.message || 'Failed to update status'),
  })
}

export function useUpgradePlan(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan) => upgradePlan({ userId, plan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(userId) })
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success('Plan updated')
    },
    onError: (e) => toast.error(e.message || 'Failed to update plan'),
  })
}

export function useRenewSubscription(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (billingCycle) => renewSubscription({ userId, billingCycle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(userId) })
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success('Subscription renewed')
    },
    onError: (e) => toast.error(e.message || 'Failed to renew subscription'),
  })
}

export function useToggleActive(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (isActive) => toggleActive({ userId, isActive }),
    onSuccess: (_, isActive) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(userId) })
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success(isActive ? 'Account activated' : 'Account deactivated')
    },
    onError: (e) => toast.error(e.message || 'Failed to toggle account'),
  })
}

export function useManualOverride(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fields) => manualOverride({ userId, fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(userId) })
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success('Subscription updated')
    },
    onError: (e) => toast.error(e.message || 'Failed to save changes'),
  })
}

export function useScheduleDeletion(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days = 14) => scheduleDeletion({ userId, days }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(userId) })
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success('Workspace scheduled for deletion')
    },
    onError: (e) => toast.error(e.message || 'Failed to schedule deletion'),
  })
}

export function useCancelDeletion(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cancelDeletion(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(userId) })
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success('Scheduled deletion cancelled')
    },
    onError: (e) => toast.error(e.message || 'Failed to cancel deletion'),
  })
}

export function usePurgeImmediately(userId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason) => purgeImmediately({ userId, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'clients', 'list'] })
      toast.success('Workspace permanently deleted')
    },
    onError: (e) => toast.error(e.message || 'Failed to delete workspace'),
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isChurnRisk(subscription) {
  if (!subscription.trial_ends_at) return false
  if (subscription.plan_name !== 'trial') return false
  const daysLeft = Math.ceil(
    (new Date(subscription.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)
  )
  return daysLeft <= 3 && daysLeft >= 0
}

export function trialDaysLeft(trialEndsAt) {
  if (!trialEndsAt) return null
  return Math.floor((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
}

export const PLANS = ['trial', 'ignite', 'velocity', 'quantum']

// Storage limits — must match PLAN_CONFIGS values
export const PLAN_STORAGE_BYTES = {
  trial:    214_748_364_800,  // 200 GB
  ignite:    53_687_091_200,  //  50 GB
  velocity: 214_748_364_800,  // 200 GB
  quantum:  536_870_912_000,  // 500 GB
}

const MiB = 1024 ** 2
const GiB = 1024 ** 3
export function storageDisplay(usedBytes, maxBytes, planName) {
  const max = maxBytes || PLAN_STORAGE_BYTES[planName] || null
  if (!max) return null
  const used = usedBytes || 0
  const usedLabel = used < GiB
    ? `${(used / MiB).toFixed(0)} MB`
    : `${(used / GiB).toFixed(1)} GB`
  const maxGiB = Math.round(max / GiB)
  const pct = Math.round((used / max) * 100)
  return { usedLabel, maxGiB, pct }
}
