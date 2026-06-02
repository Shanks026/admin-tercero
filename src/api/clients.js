import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
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
    (s) => s.user_id !== superadminId && s.auth_email !== 'winterworksbusiness@gmail.com'
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
  const [subResult, prospectResult] = await Promise.all([
    supabase
      .from('agency_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('admin_prospects')
      .select('*')
      .eq('tercero_user_id', userId)
      .maybeSingle(),
  ])

  if (subResult.error) throw subResult.error

  return {
    subscription: subResult.data,
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
  trial: {
    plan_name: 'trial',
    max_clients: 3,
    max_storage_bytes: null,
    max_team_members: null,
    proposals_limit: 5,
    extra_client_price_inr: null,
    branding_agency_sidebar: false,
    branding_powered_by: false,
    finance_recurring_invoices: false,
    finance_subscriptions: false,
    finance_accrual: false,
    calendar_export: false,
    documents_collections: false,
    campaigns: false,
  },
  ignite: {
    plan_name: 'ignite',
    max_clients: 5,
    max_storage_bytes: 21_474_836_480,  // 20 GB
    max_team_members: null,
    proposals_limit: 5,
    extra_client_price_inr: 500,
    branding_agency_sidebar: false,
    branding_powered_by: true,
    finance_recurring_invoices: false,
    finance_subscriptions: false,
    finance_accrual: false,
    calendar_export: false,
    documents_collections: false,
    campaigns: false,
  },
  velocity: {
    plan_name: 'velocity',
    max_clients: 15,
    max_storage_bytes: 107_374_182_400,  // 100 GB
    max_team_members: null,
    proposals_limit: null,
    extra_client_price_inr: 500,
    branding_agency_sidebar: true,
    branding_powered_by: true,
    finance_recurring_invoices: true,
    finance_subscriptions: true,
    finance_accrual: true,
    calendar_export: true,
    documents_collections: true,
    campaigns: true,
  },
  quantum: {
    plan_name: 'quantum',
    max_clients: 35,
    max_storage_bytes: 536_870_912_000,
    max_team_members: null,
    proposals_limit: null,
    extra_client_price_inr: 500,
    branding_agency_sidebar: true,
    branding_powered_by: false,
    finance_recurring_invoices: true,
    finance_subscriptions: true,
    finance_accrual: true,
    calendar_export: true,
    documents_collections: true,
    campaigns: true,
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

async function upgradePlan({ userId, plan }) {
  const config = PLAN_CONFIGS[plan]
  if (!config) throw new Error(`Unknown plan: ${plan}`)
  const { error } = await supabaseAdmin
    .from('agency_subscriptions')
    .update(config)
    .eq('user_id', userId)
  if (error) throw error
}

async function renewSubscription({ userId, billingCycle }) {
  const days = billingCycle === 'yearly' ? 365 : 30
  const endsAt = new Date()
  endsAt.setDate(endsAt.getDate() + days)
  const { error } = await supabaseAdmin
    .from('agency_subscriptions')
    .update({ subscription_ends_at: endsAt.toISOString(), is_active: true })
    .eq('user_id', userId)
  if (error) throw error
}

async function toggleActive({ userId, isActive }) {
  const { error } = await supabaseAdmin
    .from('agency_subscriptions')
    .update({ is_active: isActive })
    .eq('user_id', userId)
  if (error) throw error
}

async function manualOverride({ userId, fields }) {
  const { error } = await supabaseAdmin
    .from('agency_subscriptions')
    .update(fields)
    .eq('user_id', userId)
  if (error) throw error
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
  return Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
}

export const PLANS = ['trial', 'ignite', 'velocity', 'quantum']

// Binary GiB limits — must match agency_subscriptions seed values
export const PLAN_STORAGE_BYTES = {
  trial:    21_474_836_480,   // 20 GiB
  ignite:   21_474_836_480,   // 20 GiB
  velocity: 107_374_182_400,  // 100 GiB
  quantum:  536_870_912_000,  // 500 GiB
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
