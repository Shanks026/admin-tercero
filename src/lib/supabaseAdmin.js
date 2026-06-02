import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS for admin subscription writes.
// Never expose this key to end users; this app is admin-only so it's acceptable here.
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
