import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Role = 'Guest' | 'Club' | 'Delegate' | 'Admin' | 'Referee'

type Profile = { id: string; display_name: string | null; role: Role | null }

export function useSupabaseAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userDisplay, setUserDisplay] = useState<string>('')
  const [role, setRole] = useState<Role>('Guest')

  // pomocniczo, żeby UI mógł wiedzieć że JEST sesja (nawet jeśli rola=Guest)
  const isAuthenticated = !!userId

  useEffect(() => {
    // 1) stan początkowy
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u?.id) {
        setUserId(u.id)
        setUserEmail(u.email ?? null)
        setUserDisplay(u.email ?? 'Użytkownik') // szybki fallback
        loadProfile(u.id)
      } else {
        reset()
      }
    })

    // 2) nasłuch zmian sesji
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      if (u?.id) {
        setUserId(u.id)
        setUserEmail(u.email ?? null)
        setUserDisplay(u.email ?? 'Użytkownik') // szybki fallback
        loadProfile(u.id)
      } else {
        reset()
      }
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  function reset() {
    setUserId(null)
    setUserEmail(null)
    setUserDisplay('')
    setRole('Guest')
  }

  async function loadProfile(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', id)
      .maybeSingle()

    if (!error && data) {
      setUserDisplay(data.display_name || userEmail || 'Użytkownik')
      setRole((data.role as Role) || 'Guest')
    } else {
      // profil brak / błąd — zostawiamy rolę jako Guest,
      // ale użytkownik pozostaje zalogowany (isAuthenticated = true)
      setUserDisplay(userEmail || 'Użytkownik')
      setRole('Guest')
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // na tym etapie onAuthStateChange i tak przełączy stan
  }

  async function signOut() {
    await supabase.auth.signOut()
    reset()
  }

  async function changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return { userId, userDisplay, role, isAuthenticated, signIn, signOut, changePassword }
}
