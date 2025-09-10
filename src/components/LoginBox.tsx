import React, { useState } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

export const LoginBox: React.FC<{ classes: Record<string, string> }> = ({ classes }) => {
  const { role, userDisplay, signIn, signOut, changePassword } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')

  if (role !== 'Guest') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{userDisplay}</span>
        <input className={classes.input} style={{width:160}} placeholder="Nowe hasło" value={newPass} onChange={e=>setNewPass(e.target.value)} />
        <button className={classes.btnSecondary} onClick={async()=>{ try{ await changePassword(newPass); alert('Hasło zmienione'); setNewPass('') } catch(e:any){ alert(e.message)} }}>Zmień hasło</button>
        <button className={classes.btnSecondary} onClick={()=>signOut()}>Wyloguj</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input className={classes.input} placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" className={classes.input} placeholder="Hasło" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className={classes.btnSecondary} onClick={async()=>{ try{ await signIn(email, password) } catch(e:any){ alert(e.message) } }}>Zaloguj</button>
    </div>
  )
}
