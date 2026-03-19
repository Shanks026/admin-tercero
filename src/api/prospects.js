import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// ─── Query keys ──────────────────────────────────────────────────────────────

const KEYS = {
  list: (filters) => ['admin', 'prospects', 'list', filters],
  detail: (id) => ['admin', 'prospects', 'detail', id],
  outreach: (prospectId) => ['admin', 'prospects', 'outreach', prospectId],
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

async function fetchProspects(filters = {}) {
  let query = supabase
    .from('admin_prospects')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.search) {
    const q = `%${filters.search}%`
    query = query.or(`name.ilike.${q},agency_name.ilike.${q},email.ilike.${q}`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.source) query = query.eq('source', filters.source)

  const { data, error } = await query
  if (error) throw error
  return data
}

async function fetchProspect(id) {
  const { data, error } = await supabase
    .from('admin_prospects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

async function fetchOutreachLog(prospectId) {
  const { data, error } = await supabase
    .from('admin_outreach_log')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('contacted_at', { ascending: false })
  if (error) throw error
  return data
}

// ─── Mutation functions ───────────────────────────────────────────────────────

async function createProspect(values) {
  const { data, error } = await supabase
    .from('admin_prospects')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateProspect({ id, ...values }) {
  const { data, error } = await supabase
    .from('admin_prospects')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteProspect(id) {
  const { error } = await supabase
    .from('admin_prospects')
    .delete()
    .eq('id', id)
  if (error) throw error
}

async function addOutreachEntry({ prospect_id, channel, note, contacted_at }) {
  const { data, error } = await supabase
    .from('admin_outreach_log')
    .insert({ prospect_id, channel, note, contacted_at })
    .select()
    .single()
  if (error) throw error
  return data
}

async function bulkInsertProspects(rows) {
  const { data, error } = await supabase
    .from('admin_prospects')
    .insert(rows)
    .select()
  if (error) throw error
  return data
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProspects(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => fetchProspects(filters),
  })
}

export function useProspect(id) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => fetchProspect(id),
    enabled: !!id,
  })
}

export function useOutreachLog(prospectId) {
  return useQuery({
    queryKey: KEYS.outreach(prospectId),
    queryFn: () => fetchOutreachLog(prospectId),
    enabled: !!prospectId,
  })
}

export function useCreateProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProspect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'prospects'] })
      toast.success('Prospect added')
    },
    onError: (e) => toast.error(e.message || 'Failed to add prospect'),
  })
}

export function useUpdateProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProspect,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'prospects'] })
      toast.success('Prospect updated')
    },
    onError: (e) => toast.error(e.message || 'Failed to update prospect'),
  })
}

export function useDeleteProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProspect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'prospects'] })
      toast.success('Prospect deleted')
    },
    onError: (e) => toast.error(e.message || 'Failed to delete prospect'),
  })
}

export function useAddOutreachEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addOutreachEntry,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.outreach(data.prospect_id) })
      toast.success('Outreach logged')
    },
    onError: (e) => toast.error(e.message || 'Failed to log outreach'),
  })
}

export function useBulkInsertProspects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: bulkInsertProspects,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'prospects'] })
      toast.success(`${data.length} prospect${data.length !== 1 ? 's' : ''} imported`)
    },
    onError: (e) => toast.error(e.message || 'Import failed'),
  })
}
