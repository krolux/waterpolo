import React, { useState } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

export const LoginBox: React.FC<{ classes: Record<string, string> }> = ({ classes }) => {
  const { role, userDisplay, signIn, signOut, changePassword } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    if (busy) return
    try {
      setBusy(true)
      await signIn(email, password)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleChangePass() {
    if (busy) return
    try {
      setBusy(true)
      await changePassword(newPass)
      alert('Hasło zmienione')
      setNewPass('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  // WIDOK PO ZALOGOWANIU
  if (role !== 'Guest') {
    return (
      <div className="w-full max-w-[420px] min-w-0">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
          <span className="text-sm text-gray-700 truncate sm:max-w-[140px]" title={userDisplay}>
            {userDisplay}
          </span>

          <input
            aria-label="Nowe hasło"
            className={`${classes.input} px-4 py-3 w-full sm:w-[180px]`}
            placeholder="Nowe hasło"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            type="password"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && handleChangePass()}
          />

          <button
            type="button"
            className={`${classes.btnSecondary} px-4 py-3 w-full sm:w-auto`}
            onClick={handleChangePass}
            disabled={busy || newPass.length === 0}
          >
            Zmień hasło
          </button>

          <button
            type="button"
            className={`${classes.btnSecondary} px-4 py-3 w-full sm:w-auto`}
            onClick={() => signOut()}
            disabled={busy}
          >
            Wyloguj
          </button>
        </div>
      </div>
    )
  }

  // WIDOK PRZED ZALOGOWANIEM
  return (
    <div className="w-full max-w-[420px] min-w-0">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
        <input
          aria-label="Email"
          className={`${classes.input} px-4 py-3 w-full`}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username email"
          inputMode="email"
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
        />

        <input
          aria-label="Hasło"
          type="password"
          className={`${classes.input} px-4 py-3 w-full`}
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
        />

        <button
          type="button"
          className={`${classes.btnSecondary} px-4 py-3 w-full sm:w-auto`}
          onClick={handleSignIn}
          disabled={busy || !email || !password}
        >
          Zaloguj
        </button>
      </div>
    </div>
  )
}