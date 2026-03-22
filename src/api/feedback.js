import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const KEYS = {
  all: ['admin', 'feedback'],
}

async function fetchFeedback() {
  const { data: feedback, error } = await supabase
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!feedback?.length) return []

  const userIds = [...new Set(feedback.map((f) => f.workspace_user_id))]

  const { data: subs } = await supabase
    .from('agency_subscriptions')
    .select('user_id, email, agency_name, plan_name, logo_url')
    .in('user_id', userIds)

  const subMap = Object.fromEntries((subs || []).map((s) => [s.user_id, s]))

  return feedback.map((f) => ({
    ...f,
    email:       subMap[f.workspace_user_id]?.email       ?? null,
    agency_name: subMap[f.workspace_user_id]?.agency_name ?? null,
    logo_url:    subMap[f.workspace_user_id]?.logo_url    ?? null,
  }))
}

async function updateFeedbackStatus({ id, status, admin_notes }) {
  const { error } = await supabase
    .from('user_feedback')
    .update({ status, admin_notes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export function useFeedback() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: fetchFeedback,
  })
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateFeedbackStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      toast.success('Status updated')
    },
    onError: (e) => toast.error(e.message || 'Failed to update'),
  })
}

export const FEEDBACK_STATUSES = ['received', 'open', 'in_progress', 'resolved', 'closed']
