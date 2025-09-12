import React, { useState } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

export const LoginBox: React.FC<{ classes: Record<string, string> }> = ({ classes }) => {
  const { role, userDisplay, signIn, signOut, changePassword } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')

  async function handleSignIn() {
    try {
      await signIn(email, password)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleChangePass() {
    try {
      await changePassword(newPass)
      alert('Hasło zmienione')
      setNewPass('')
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (role !== 'Guest') {
    return (
      <div className="w-full max-w-[420px]">
        {/* mobile: kolumna / desktop: rząd */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <span className="text-sm text-gray-700 sm:mr-1">{userDisplay}</span>

          {/* na mobile pełna szerokość, na desktop stałe ~160px */}
          <input
            className={`${classes.input} w-full sm:w-[180px]`}
            placeholder="Nowe hasło"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            type="password"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && handleChangePass()}
          />

          <button
            className={`${classes.btnSecondary} w-full sm:w-auto`}
            onClick={handleChangePass}
          >
            Zmień hasło
          </button>

          <button
            className={`${classes.btnSecondary} w-full sm:w-auto`}
            onClick={() => signOut()}
          >
            Wyloguj
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[420px]">
      {/* mobile: kolumna / desktop: rząd */}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
        <input
          className={`${classes.input} w-full`}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username"
          inputMode="email"
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
        />
        <input
          type="password"
          className={`${classes.input} w-full`}
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
        />
        <button
          className={`${classes.btnSecondary} w-full sm:w-auto`}
          onClick={handleSignIn}
        >
          Zaloguj
        </button>
      </div>
    </div>
  )
}
