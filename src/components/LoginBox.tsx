import React, { useState } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

export const LoginBox: React.FC<{ classes: Record<string, string> }> = ({ classes }) => {
  const { role, userDisplay, signIn, signOut, changePassword } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')

  async function handleSignIn() {
    try { await signIn(email, password) } catch (e: any) { alert(e.message) }
  }
  async function handleChangePass() {
    try { await changePassword(newPass); alert('Hasło zmienione'); setNewPass('') } catch (e: any) { alert(e.message) }
  }

  if (role !== 'Guest') {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
          <span className="text-sm text-gray-700 sm:mr-1">{userDisplay}</span>

          <input
            className={`${classes.input} w-full sm:w-[200px] text-[16px]`}
            placeholder="Nowe hasło"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            type="password"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && handleChangePass()}
          />

          <button className={`${classes.btnSecondary} w-full sm:w-auto`} onClick={handleChangePass}>
            Zmień hasło
          </button>

          <button className={`${classes.btnSecondary} w-full sm:w-auto`} onClick={() => signOut()}>
            Wyloguj
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-2">
        <input
          className={`${classes.input} w-full text-[16px]`}
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
          className={`${classes.input} w-full text-[16px]`}
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
        />
        <button className={`${classes.btnPrimary} w-full sm:w-auto`} onClick={handleSignIn}>
          Zaloguj
        </button>
      </div>
    </div>
  )
}