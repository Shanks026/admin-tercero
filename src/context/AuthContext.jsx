import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  async function loadProfile(authUser) {
    if (!authUser) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    // Check agency_members for system_role = 'superadmin'
    const { data, error } = await supabase
      .from('agency_members')
      .select('member_user_id, system_role')
      .eq('member_user_id', authUser.id)
      .eq('system_role', 'superadmin')
      .maybeSingle()

    if (error || !data) {
      setAccessDenied(true)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setAccessDenied(false)
    setUser(authUser)
    setProfile({
      id: authUser.id,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
      email: authUser.email,
      system_role: data.system_role,
    })
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        loadProfile(data.session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessDenied, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
