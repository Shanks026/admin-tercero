import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

async function fetchClientOnboarding(userId) {
  const { data, error } = await supabase.rpc('admin_get_client_onboarding', {
    p_user_id: userId,
  })
  if (error) throw error
  return data
}

export function useClientOnboarding(userId) {
  return useQuery({
    queryKey: ['admin', 'clients', 'onboarding', userId],
    queryFn: () => fetchClientOnboarding(userId),
    enabled: !!userId,
  })
}
