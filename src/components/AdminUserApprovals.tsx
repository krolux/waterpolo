import React from "react";
import { supabase } from "../lib/supabase";

type User = {id:string;display_name:string|null;first_name:string|null;last_name:string|null;email:string;role:string;club_id:string|null;is_active:boolean|null};
type Club = {id:string;name:string};
const labels:Record<string,string> = {Guest:"Gość",Club:"Klub",Delegate:"Delegat",Admin:"Administrator",Referee:"Sędzia",Editor:"Redaktor"};
const blank = {display_name:"",first_name:"",last_name:"",email:"",role:"Guest",club_id:"",password:""};
const inputClass = "w-full rounded-xl border border-sky-200 bg-white p-2 text-sm";
const buttonClass = "rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm hover:bg-sky-50 disabled:opacity-50";

async function adminRequest(body:Record<string,unknown>) {
  const {data,error} = await supabase.functions.invoke("admin-users",{body});
  if(error) {
    let message = error.message;
    if("context" in error && error.context instanceof Response) {
      try { message = (await error.context.json()).error || message; } catch { /* preserve transport error */ }
    }
    throw new Error(message);
  }
  if(data?.error) throw new Error(data.error);
  return data;
}

export const AdminUserApprovals:React.FC<{onBack:()=>void}> = ({onBack}) => {
  const [users,setUsers] = React.useState<User[]>([]);
  const [clubs,setClubs] = React.useState<Club[]>([]);
  const [roles,setRoles] = React.useState<string[]>([]);
  const [self,setSelf] = React.useState("");
  const [query,setQuery] = React.useState("");
  const [pending,setPending] = React.useState(false);
  const [loading,setLoading] = React.useState(true);
  const [busy,setBusy] = React.useState(false);
  const [error,setError] = React.useState("");
  const [message,setMessage] = React.useState("");
  const [editing,setEditing] = React.useState<User|null>(null);
  const [mode,setMode] = React.useState<"create"|"edit"|"password"|null>(null);
  const [draft,setDraft] = React.useState({...blank});
  const [showPassword,setShowPassword] = React.useState(false);
  const load = React.useCallback(async()=>{
    setLoading(true);
    try {
      const result = await adminRequest({action:"list"});
      setUsers(result.users);setClubs(result.clubs);setRoles(result.roles);setSelf(result.currentUserId);
    } catch(e) {setError(e instanceof Error?e.message:String(e));}
    finally {setLoading(false);}
  },[]);
  React.useEffect(()=>{void load();},[load]);
  function open(next:"create"|"edit"|"password",user:User|null=null) {
    setMode(next);setEditing(user);setShowPassword(false);setError("");setMessage("");
    setDraft(user?{...blank,display_name:user.display_name||"",first_name:user.first_name||"",last_name:user.last_name||"",email:user.email,role:user.role,club_id:user.club_id||""}:{...blank});
  }
  function close() {setMode(null);setEditing(null);setDraft({...blank});setShowPassword(false);}
  async function submit(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError("");setMessage("");
    try {
      const action = mode!;
      const body = action === "password" ? {action,id:editing!.id,password:draft.password} : {action,id:editing?.id,...draft};
      await adminRequest(body);
      close();setMessage(action==="create"?"Utworzono aktywne konto użytkownika.":action==="password"?"Ustawiono nowe hasło użytkownika.":"Zapisano profil użytkownika.");
      await load();
    } catch(e) {setError(e instanceof Error?e.message:String(e));}
    finally {setBusy(false);}
  }
  async function approve(user:User) {
    setBusy(true);setError("");setMessage("");
    try {await adminRequest({action:"approve",id:user.id});setMessage("Zaakceptowano użytkownika.");await load();}
    catch(e) {setError(e instanceof Error?e.message:String(e));}
    finally {setBusy(false);}
  }
  const clubNames = new Map(clubs.map(c=>[c.id,c.name]));
  const visible = users.filter(u=>(!pending||u.is_active===false)&&[u.display_name,u.email,u.first_name,u.last_name,clubNames.get(u.club_id||"")].join(" ").toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl')));
  function field(name:keyof typeof blank,value:string) {setDraft(prev=>({...prev,[name]:value}));}
  return <section className="mx-auto max-w-6xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">Użytkownicy</h2>
      <div className="flex gap-2"><button className={buttonClass} onClick={()=>open("create")} disabled={busy}>Dodaj użytkownika</button><button className={buttonClass} onClick={onBack}>Wróć do Startu</button></div>
    </div>
    {message&&<p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{message}</p>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    {mode&&<form onSubmit={submit} className="rounded-2xl border border-sky-200 bg-white p-4 space-y-3">
      <h3 className="text-lg font-semibold">{mode==="create"?"Nowy użytkownik":mode==="edit"?"Edytuj użytkownika":"Ustaw nowe hasło"}{editing?` — ${editing.display_name||editing.email}`:""}</h3>
      {mode!=="password"&&<div className="grid gap-3 sm:grid-cols-2">
        <label>Nazwa użytkownika<input className={inputClass} required maxLength={100} value={draft.display_name} onChange={e=>field("display_name",e.target.value)}/></label>
        <label>E-mail<input className={inputClass} type="email" required maxLength={254} disabled={mode==="edit"} value={draft.email} onChange={e=>field("email",e.target.value)}/></label>
        <label>Imię<input className={inputClass} maxLength={100} value={draft.first_name} onChange={e=>field("first_name",e.target.value)}/></label>
        <label>Nazwisko<input className={inputClass} maxLength={100} value={draft.last_name} onChange={e=>field("last_name",e.target.value)}/></label>
        <label>Rola<select className={inputClass} disabled={editing?.id===self} value={draft.role} onChange={e=>field("role",e.target.value)}>{roles.map(role=><option key={role} value={role}>{labels[role]||role}</option>)}</select></label>
        <label>Klub<select className={inputClass} required={draft.role==="Club"} value={draft.club_id} onChange={e=>field("club_id",e.target.value)}><option value="">Bez klubu</option>{clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>}
      {mode!=="edit"&&<div className="space-y-2">
        <label>{mode==="create"?"Hasło początkowe":"Nowe hasło"}<input className={inputClass} type={showPassword?"text":"password"} autoComplete="new-password" minLength={8} maxLength={128} required value={draft.password} onChange={e=>field("password",e.target.value)}/></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)}/>Pokaż wpisane hasło</label>
        <p className="text-xs text-slate-600">Minimum 8 znaków. Obecnego hasła nie można odczytać. Po zapisie pole zostanie wyczyszczone.</p>
      </div>}
      <div className="flex gap-2"><button className="rounded-xl bg-sky-600 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>{busy?"Zapisywanie…":mode==="create"?"Utwórz konto":"Zapisz zmiany"}</button><button type="button" className={buttonClass} disabled={busy} onClick={close}>Anuluj</button></div>
    </form>}
    <div className="flex flex-wrap items-center gap-3"><input aria-label="Szukaj użytkownika" placeholder="Szukaj po nazwie, e-mailu lub klubie" className={inputClass+" sm:max-w-sm"} value={query} onChange={e=>setQuery(e.target.value)}/><label className="flex gap-2 text-sm"><input type="checkbox" checked={pending} onChange={e=>setPending(e.target.checked)}/>Tylko oczekujący ({users.filter(u=>u.is_active===false).length})</label><button className={buttonClass} disabled={loading||busy} onClick={()=>{setError("");void load();}}>Odśwież</button></div>
    <div className="overflow-x-auto rounded-2xl border border-sky-100 bg-white">
      {loading?<p className="p-4">Ładowanie użytkowników…</p>:visible.length===0?<p className="p-4">Brak użytkowników spełniających kryteria.</p>:<table className="w-full text-left text-sm"><thead className="bg-sky-50"><tr>{["Nazwa / e-mail","Rola","Klub","Status","Akcje"].map(t=><th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{visible.map(user=><tr key={user.id} className="border-t"><td className="p-3"><b>{user.display_name||"Bez nazwy"}</b><div className="text-slate-500">{user.email||"—"}</div></td><td className="p-3">{labels[user.role]||user.role}</td><td className="p-3">{clubNames.get(user.club_id||"")||"—"}</td><td className="p-3">{user.is_active===false?"Oczekuje":"Aktywny"}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={()=>open("edit",user)}>Edytuj</button>{user.id!==self&&<button className={buttonClass} disabled={busy} onClick={()=>open("password",user)}>Ustaw hasło</button>}{user.is_active===false&&<button className={buttonClass} disabled={busy} onClick={()=>void approve(user)}>Akceptuj</button>}</div></td></tr>)}</tbody></table>}
    </div>
  </section>;
};
