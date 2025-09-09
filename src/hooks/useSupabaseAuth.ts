import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Role = 'Guest' | 'Club' | 'Delegate' | 'Admin'

export function useSupabaseAuth() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null)
  const [profile, setProfile] = useState<{ id: string; display_name: string; role: Role; club_id?: string | null } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => { setSession(sess) })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    async function fetchProfile() {
      if (!session?.user) { setProfile(null); setLoading(false); return }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, role, club_id')
        .eq('id', session.user.id)
        .single()
      if (error) { console.error(error); setProfile(null) } else setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [session?.user?.id])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  async function signOut() { await supabase.auth.signOut() }
  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const role: Role = profile?.role ?? 'Guest'
  const userDisplay = profile?.display_name || session?.user?.email || 'Użytkownik'

  return { loading, session, profile, role, userDisplay, signIn, signOut, changePassword }
}
