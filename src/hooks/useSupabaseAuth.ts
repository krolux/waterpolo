import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Role = 'Guest' | 'Club' | 'Delegate' | 'Admin' | 'Referee'

type Profile = { id: string; display_name: string | null; role: Role | null }

export function useSupabaseAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userDisplay, setUserDisplay] = useState<string>('')
  const [role, setRole] = useState<Role>('Guest')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u?.id) {
        setUserId(u.id)
        loadProfile(u.id)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      if (u?.id) {
        setUserId(u.id)
        loadProfile(u.id)
      } else {
        setUserId(null)
        setUserDisplay('')
        setRole('Guest')
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function loadProfile(id: string) {
    const { data, error } = await supabase.from('profiles').select('id, display_name, role').eq('id', id).maybeSingle()
    if (!error && data) {
      setUserDisplay(data.display_name || 'Użytkownik')
      setRole((data.role as Role) || 'Guest')
    } else {
      setUserDisplay('Użytkownik')
      setRole('Guest')
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return { userId, userDisplay, role, signIn, signOut, changePassword }
}
