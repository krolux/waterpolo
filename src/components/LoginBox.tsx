import React, { useState } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { LogIn, LogOut } from 'lucide-react'

export const LoginBox: React.FC<{ classes: any }> = ({ classes }) => {
  const { loading, role, userDisplay, signIn, signOut, changePassword } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')

  if (loading) return <div className="text-sm text-gray-600">Ładowanie...</div>

  if (role !== 'Guest') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{userDisplay}</span>
        <span className="text-xs px-2 py-1 rounded-full border bg-white">{role}</span>
        <button onClick={signOut} className={classes.btnSecondary}>
          <LogOut className="w-4 h-4 inline mr-1"/>Wyloguj
        </button>
        <form className="flex items-center gap-2" onSubmit={async (e)=>{e.preventDefault(); if(!newPwd) return; await changePassword(newPwd); setNewPwd(''); alert('Hasło zmienione');}}>
          <input className={classes.input} style={{width:200}} placeholder="Nowe hasło" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/>
          <button className={classes.btnSecondary} type="submit">Zmień hasło</button>
        </form>
      </div>
    )
  }

  return (
    <form className="flex items-center gap-2" onSubmit={async (e)=>{e.preventDefault(); await signIn(email, pwd)}}>
      <input className={classes.input} style={{width:220}} placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className={classes.input} style={{width:180}} placeholder="Hasło" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
      <button className={classes.btnSecondary} type="submit">
        <LogIn className="w-4 h-4 inline mr-1"/>Zaloguj
      </button>
    </form>
  )
}
