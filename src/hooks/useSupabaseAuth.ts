import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Role = 'Guest' | 'Club' | 'Delegate' | 'Admin' | 'Referee'

export function useSupabaseAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userDisplay, setUserDisplay] = useState<string>('Użytkownik')
  const [role, setRole] = useState<Role>('Guest')

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.warn('[auth.getUser] error', error)
      const u = data?.user
      if (u?.id) { setUserId(u.id); loadProfile(u.id) }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      const u = session?.user
      console.log('[onAuthStateChange]', evt, u?.id)
      if (u?.id) { setUserId(u.id); loadProfile(u.id) }
      else { setUserId(null); setUserDisplay('Użytkownik'); setRole('Guest') }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function loadProfile(id: string) {
    console.log('[loadProfile] for', id)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.warn('[loadProfile] error (RLS?):', error)
      setUserDisplay('Użytkownik'); setRole('Guest'); return
    }
    if (!data) {
      console.warn('[loadProfile] no row in profiles for', id)
      setUserDisplay('Użytkownik'); setRole('Guest'); return
    }
    setUserDisplay(data.display_name || 'Użytkownik')
    setRole((data.role as Role) || 'Guest')
  }

  async function signIn(email: string, password: string) {
    console.log('[signIn] try', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), password
    })
    if (error) { console.error('[signIn] error', error); throw error }
    console.log('[signIn] ok', data.user?.id)
    if (data.user?.id) await loadProfile(data.user.id) // natychmiast dociągnij profil
  }

  async function signOut() { await supabase.auth.signOut() }
  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return { userId, userDisplay, role, signIn, signOut, changePassword }
}
