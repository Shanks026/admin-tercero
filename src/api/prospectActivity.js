import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const KEY = (prospectId) => ['admin', 'prospect', 'activity', prospectId]

async function fetchActivity(prospectId) {
  const { data, error } = await supabase
    .from('admin_prospect_activity')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function logActivity({ prospectId, type = 'status_change', fromStatus, toStatus, note }) {
  const { error } = await supabase.from('admin_prospect_activity').insert({
    prospect_id: prospectId,
    type,
    from_status: fromStatus ?? null,
    to_status: toStatus ?? null,
    note: note || null,
  })
  if (error) throw error
}

export function useProspectActivity(prospectId) {
  return useQuery({
    queryKey: KEY(prospectId),
    queryFn: () => fetchActivity(prospectId),
    enabled: !!prospectId,
  })
}

export function useLogActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logActivity,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY(vars.prospectId) })
    },
  })
}
