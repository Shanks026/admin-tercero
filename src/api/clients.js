import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const KEYS = {
  list: (filters) => ['admin', 'clients', 'list', filters],
  detail: (userId) => ['admin', 'clients', 'detail', userId],
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchClients({ search, plan, superadminId } = {}) {
  // agency_subscriptions is publicly readable — filter superadmin client-side
  let query = supabase
    .from('agency_subscriptions')
    .select(`
      user_id, plan_name, trial_ends_at, agency_name, email,
      current_storage_used, max_storage_bytes, is_active, created_at
    `)
    .order('created_at', { ascending: false })

  if (plan && plan !== 'all') query = query.eq('plan_name', plan)

  const { data, error } = await query
  if (error) throw error

  let results = (data || []).filter(
    (s) => s.user_id !== superadminId && s.email !== 'winterworksbusiness@gmail.com'
  )

  if (search) {
    const q = search.toLowerCase()
    results = results.filter(
      (s) =>
        s.agency_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
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

// ─── Mutations ────────────────────────────────────────────────────────────────

async function updateClientProspectStatus({ userId, status }) {
  const { error } = await supabase
    .from('admin_prospects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tercero_user_id', userId)
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
