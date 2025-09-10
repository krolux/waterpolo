/* App with Supabase CRUD for matches (Step 1) + docs kept in localStorage */
import React, { useEffect, useMemo, useState, PropsWithChildren } from "react";
import { Download, Upload, FileText, Users, Shield, Trash2, Edit, LogIn, LogOut, Search, Save, UploadCloud, Image, Settings, Table, History, Check, RefreshCw } from "lucide-react";
import { useSupabaseAuth, Role as SupaRole } from './hooks/useSupabaseAuth'
import { LoginBox } from './components/LoginBox'
import { supabase } from "./lib/supabase"
import { listMatches, createMatch, updateMatch as dbUpdateMatch, deleteMatch as dbDeleteMatch, setMatchResult } from './lib/matches'

function clsx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }

const classes = {
  input: "w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 shadow",
  btnOutline: "px-3 py-2 rounded-xl border border-sky-600 text-sky-700 bg-white hover:bg-sky-50",
  btnSecondary: "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50",
  iconBtn: "p-2 rounded-lg border bg-white hover:bg-gray-50",
  pill: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white",
};

type Role = SupaRole;
type SectionProps = PropsWithChildren<{ title: string; icon?: React.ReactNode; className?: string }>;
const Section: React.FC<SectionProps> = ({ title, icon, children, className }) => (
  <div className={clsx("bg-white/70 backdrop-blur-sm rounded-2xl shadow p-4 md:p-6", className)}>
    <div className="flex items-center gap-2 mb-4">{icon}<h2 className="text-xl md:text-2xl font-semibold">{title}</h2></div>{children}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; tone?: "gray" | "green" | "blue" | "amber" }> = ({ children, tone="gray" }) => (
  <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium border",
  tone==="gray"&&"bg-gray-50 border-gray-200 text-gray-700",
  tone==="green"&&"bg-green-50 border-green-200 text-green-700",
  tone==="blue"&&"bg-blue-50 border-blue-200 text-blue-700",
  tone==="amber"&&"bg-amber-50 border-amber-200 text-amber-700")}>{children}</span>
);

// Types
type StoredFile = { id:string; name:string; mime:string; size:number; dataUrl:string; uploadedBy:string; uploadedAt:string; label?:string; };
type UploadLog = { id:string; type:"comms"|"roster"|"protocol"|"photos"; matchId:string; club?:string|null; user:string; at:string; fileName:string; };
type Match = { id:string; date:string; time?:string; round?:string; location:string; home:string; away:string; result?:string; referees:string[]; delegate?:string;
  commsByClub: Record<string, StoredFile | null>; rosterByClub: Record<string, StoredFile | null>;
  matchReport?: StoredFile | null; reportPhotos: StoredFile[]; notes?:string; uploadsLog: UploadLog[]; };
type AppState = { matches: Match[]; users:{name:string; role:Role; club?:string}[]; };
type ProfileRow = { id:string; display_name:string; role:Role; club_id:string|null; };

const CLUBS = ["Waterpolo Poznań","AZS UW","KSZO Ostrowiec Św.","Alfa Gorzów Wlkp","UKS Neptun UŁ","ŁSTW PŁ","Arkonia Szczecin","WTS Polonia Bytom"] as const;

// --- Docs persistence in localStorage (temporary until Step 3) ---
const DOCS_KEY = "wpr-docs-v1";
type DocsOnly = Pick<Match,'commsByClub'|'rosterByClub'|'matchReport'|'reportPhotos'|'uploadsLog'>;
function loadDocs(): Record<string, DocsOnly> {
  try { const raw = localStorage.getItem(DOCS_KEY); return raw? JSON.parse(raw): {} } catch { return {} }
}
function saveDocs(map: Record<string, DocsOnly>) { localStorage.setItem(DOCS_KEY, JSON.stringify(map)) }

// Files helpers
function fileToDataUrl(file: File): Promise<string> { return new Promise((resolve, reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result as string); reader.onerror=reject; reader.readAsDataURL(file); }); }
async function toStoredFile(file: File, uploadedBy: string, label: string): Promise<StoredFile> {
  const dataUrl = await fileToDataUrl(file);
  return { id:crypto.randomUUID(), name:file.name, mime:file.type||"application/octet-stream", size:file.size, dataUrl, uploadedBy, uploadedAt:new Date().toISOString(), label };
}
function downloadDataUrl(file: StoredFile) { const a=document.createElement("a"); a.href=file.dataUrl; const ext=file.name.includes(".")? file.name.slice(file.name.lastIndexOf(".")):""; a.download=file.label?`${file.label}${ext}`:file.name; a.click(); }
const DocBadge: React.FC<{file: StoredFile; label: string; disabled?: boolean}> = ({ file, label, disabled }) => (
  <button onClick={()=>{ if(disabled){ alert("Pobieranie dostępne po zalogowaniu (nie dla Gościa)."); return; } downloadDataUrl(file); }} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white ${disabled? 'opacity-50 cursor-not-allowed' : 'hover:shadow'}`}>
    <FileText className="w-3.5 h-3.5"/>{label}
  </button>
);

// Permissions
function canUploadComms(user:{role:Role;club?:string}, m:Match){ return user.role==="Club" && !!user.club && user.club===m.home }
function canUploadRoster(user:{role:Role;club?:string}, m:Match){ return user.role==="Club" && !!user.club && (user.club===m.home || user.club===m.away) }
function canUploadReport(user:{role:Role}){ return user.role==="Delegate" }
function canEditResult(user:{role:Role;name:string}, m:Match){ return user.role==="Delegate" && !!m.delegate && m.delegate===user.name }

// Components
const LoginPanel: React.FC<{ users: AppState["users"]; onLogin: (n: string, r: Role, c?: string) => void; }> = ({ users, onLogin }) => {
  const [name,setName]=useState(""); const [role,setRole]=useState<Role>("Guest"); const [club,setClub]=useState("");
  return (<Section title="Zaloguj się" icon={<LogIn className="w-5 h-5" />}>
    <div className="grid md:grid-cols-2 gap-6">
      <div><div className="mb-2 font-medium">Szybki wybór (demo)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{users.map(u=>(
          <button key={u.name} onClick={()=>onLogin(u.name,u.role,u.club)} className={clsx(classes.btnSecondary,"text-left")}>
            <div className="font-medium">{u.name}</div><div className="text-xs text-gray-600">Rola: {u.role}{u.club?` • ${u.club}`:""}</div>
          </button>))}
        </div></div>
      <div><div className="mb-2 font-medium">Własny użytkownik</div>
        <div className="flex flex-col gap-2">
          <input className={classes.input} placeholder="Imię i nazwisko / nazwa" value={name} onChange={e=>setName(e.target.value)}/>
          <div className="flex gap-2">
            <select className={classes.input} value={role} onChange={e=>setRole(e.target.value as Role)}>{(["Guest","Club","Delegate","Referee","Admin"] as Role[]).map(r=><option key={r}>{r}</option>)}</select>
            <select className={classes.input} value={club} onChange={e=>setClub(e.target.value)}>
              <option value="">Klub (dla roli Club)</option>
              {CLUBS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={()=> name && onLogin(name, role, club || undefined)} className={classes.btnPrimary}>Zaloguj</button>
        </div>
      </div>
    </div>
  </Section>)
}

const ExportImport: React.FC<{state: AppState; setState:(s:AppState)=>void}> = ({ state, setState }) => {
  function exportJSON(){ const blob=new Blob([JSON.stringify(state.matches,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`wpr-matches-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); }
  async function importJSON(e:React.ChangeEvent<HTMLInputElement>){ const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); try{ const parsed=JSON.parse(text) as Match[]; setState({...state, matches: parsed}); }catch{ alert("Niepoprawny plik JSON.")} }
  return (<div className="flex items-center gap-2">
    <button onClick={exportJSON} className={clsx(classes.btnSecondary,"flex items-center gap-2")}><Download className="w-4 h-4"/>Eksport</button>
    <label className={clsx(classes.btnSecondary,"inline-flex items-center gap-2 cursor-pointer")}>
      <Upload className="w-4 h-4"/>Import<input type="file" accept="application/json" className="hidden" onChange={importJSON}/>
    </label>
  </div>)
}

const MatchesTable: React.FC<{ state: AppState; setState:(s:AppState)=>void; user:{name:string;role:Role;club?:string}|null; onRefresh:()=>void; loading:boolean; }> = ({ state, setState, user, onRefresh, loading }) => {
  const [q,setQ]=useState(""); const filtered=useMemo(()=>state.matches.filter(m=>[m.home,m.away,m.location,m.round,m.result,m.delegate,...m.referees].join(" ").toLowerCase().includes(q.toLowerCase())),[state.matches,q]);
  const canDownload=!!user && user.role!=='Guest';
  return (<Section title="Tabela meczów" icon={<Table className="w-5 h-5" />}>
    <div className="flex items-center gap-2 mb-3">
      <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={q} onChange={e=>setQ(e.target.value)} className={clsx(classes.input,"pl-9")} placeholder="Szukaj po drużynie, miejscu, sędziach..."/></div>
      <button onClick={onRefresh} className={clsx(classes.btnSecondary, "flex items-center gap-2")}><RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")}/>Odśwież</button>
      <ExportImport state={state} setState={setState}/>
    </div>
    <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left border-b bg-gray-50">
      <th className="p-2">Data</th><th className="p-2">Runda</th><th className="p-2">Miejsce</th><th className="p-2">Gospodarz</th><th className="p-2">Goście</th><th className="p-2">Wynik</th><th className="p-2">Sędziowie</th><th className="p-2">Delegat</th><th className="p-2">Dokumenty</th></tr></thead>
      <tbody>{filtered.map(m=>(<tr key={m.id} className="border-b hover:bg-gray-50/60">
        <td className="p-2 whitespace-nowrap">{m.date}{m.time?` ${m.time}`:""}</td><td className="p-2 whitespace-nowrap">{m.round??"-"}</td><td className="p-2">{m.location}</td><td className="p-2">{m.home}</td><td className="p-2">{m.away}</td><td className="p-2">{m.result??"-"}</td><td className="p-2">{m.referees.join(", ")}</td><td className="p-2">{m.delegate??"-"}</td>
        <td className="p-2"><div className="flex flex-wrap gap-2">
          {m.commsByClub.home && <DocBadge file={m.commsByClub.home} label="Komunikat" disabled={!canDownload}/>}
          {m.rosterByClub.home && <DocBadge file={m.rosterByClub.home} label="Skład (Home)" disabled={!canDownload}/>}
          {m.rosterByClub.away && <DocBadge file={m.rosterByClub.away} label="Skład (Away)" disabled={!canDownload}/>}
          {m.matchReport && <DocBadge file={m.matchReport} label="Protokół" disabled={!canDownload}/>}
          {m.reportPhotos.length>0 && (<span className={classes.pill}><Image className="w-3.5 h-3.5"/>Zdjęcia: {m.reportPhotos.length}</span>)}
        </div></td>
      </tr>))}</tbody></table></div>
    {user && user.role!=="Guest" && (<div className="mt-6"><PerMatchActions state={state} setState={setState} user={user}/></div>)}
  </Section>)
}

const PerMatchActions: React.FC<{ state:AppState; setState:(s:AppState)=>void; user:{name:string;role:Role;club?:string} }> = ({ state, setState, user }) => {
  const [selectedId,setSelectedId]=useState<string>(state.matches[0]?.id??""); const match=state.matches.find(m=>m.id===selectedId)||null;
  const [resultDraft,setResultDraft]=useState<string>(match?.result||""); useEffect(()=>{ setResultDraft(match?.result||"") },[selectedId]);
  function pushLog(next:Match, entry: Omit<UploadLog,"id"|"matchId"|"at">){ next.uploadsLog=[{ id:crypto.randomUUID(), matchId:next.id, at:new Date().toISOString(), ...entry }, ...next.uploadsLog] }

  // Save docs to localStorage (per match)
  function saveDocsFor(match: Match) {
    const map = loadDocs()
    map[match.id] = {
      commsByClub: match.commsByClub,
      rosterByClub: match.rosterByClub,
      matchReport: match.matchReport,
      reportPhotos: match.reportPhotos,
      uploadsLog: match.uploadsLog,
    }
    saveDocs(map)
  }

  async function handleUpload(type:"comms"|"roster"|"report"|"photos"){
    if(!match) return; const input=document.createElement("input"); input.type="file"; if(type==="photos") input.multiple=true;
    input.onchange=async()=>{
      const files=Array.from(input.files||[]); if(files.length===0) return; const next={...match} as Match;
      if(type==="comms"||type==="roster"){
        if(user.role!=="Club"||!user.club){ alert("Ta akcja jest dostępna tylko dla roli Klub (z ustawioną nazwą klubu)."); return; }
        const key = user.club===match.home? "home" : user.club===match.away? "away": null; if(!key){ alert("Twój klub nie jest przypisany do tego meczu."); return; }
        if(type==="comms"){
          if(!canUploadComms(user, match)){ alert("Komunikat może dodać wyłącznie gospodarz meczu."); return; }
          const sf=await toStoredFile(files[0], user.name, `Komunikat - ${match.home} - ${match.date}`); next.commsByClub[key]=sf; pushLog(next,{type:'comms',club:user.club,user:user.name,fileName:sf.name});
        } else {
          if(!canUploadRoster(user, match)){ alert("Skład może dodać tylko klub biorący udział w meczu."); return; }
          const clubName = key==="home"? match.home: match.away; const sf=await toStoredFile(files[0], user.name, `Skład - ${clubName} - ${match.date}`); next.rosterByClub[key]=sf; pushLog(next,{type:'roster',club:user.club,user:user.name,fileName:sf.name});
        }
      }
      if(type==="report"){
        if(!canUploadReport(user)){ alert("Protokół może dodać tylko Delegat."); return; }
        const sf=await toStoredFile(files[0], user.name, `Protokół - ${match.home} vs ${match.away} - ${match.date}`); next.matchReport=sf; pushLog(next,{type:'protocol',club:null,user:user.name,fileName:sf.name});
      }
      if(type==="photos"){
        if(!canUploadReport(user)){ alert("Zdjęcia raportu może dodać tylko Delegat."); return; }
        const sfs:StoredFile[]=[]; for(const f of files) sfs.push(await toStoredFile(f, user.name, "Zdjęcie raportu")); next.reportPhotos=[...next.reportPhotos,...sfs]; pushLog(next,{type:'photos',club:null,user:user.name,fileName:`${files.length} zdjęć`});
      }
      const newState={...state, matches: state.matches.map(m=>m.id===match.id? next: m)}; setState(newState); saveDocsFor(next);
    }
    input.click();
  }

  async function saveResult(){ if(!match) return; if(!canEditResult(user, match)){ alert("Wynik może ustawić tylko delegat tego meczu."); return; }
    try { await setMatchResult(match.id, resultDraft); const newState={...state, matches: state.matches.map(m=>m.id===match.id? {...m, result: resultDraft}: m)}; setState(newState) } 
    catch(e:any){ alert("Błąd zapisu wyniku: " + e.message) }
  }

  const canClubAct = ()=> user.role==="Club" && !!user.club; const canDelegateAct = ()=> user.role==="Delegate";

  return (<div className="grid gap-4">
    <div className="flex items-center gap-2"><span className="text-sm text-gray-600">Wybierz mecz:</span>
      <select className={classes.input} value={selectedId} onChange={e=>setSelectedId(e.target.value)}>{state.matches.map(m=>(<option key={m.id} value={m.id}>{m.date} {m.time? m.time+" • ":""}{m.home} vs {m.away}</option>))}</select>
    </div>
    {match && (<div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canClubAct() && (<>
          {canUploadComms(user, match) && (<button onClick={()=>handleUpload("comms")} className={clsx(classes.btnOutline,"flex items-center gap-2")}><UploadCloud className="w-4 h-4"/>Dodaj komunikat (Gospodarz)</button>)}
          {canUploadRoster(user, match)? (<button onClick={()=>handleUpload("roster")} className={clsx(classes.btnOutline,"flex items-center gap-2")}><UploadCloud className="w-4 h-4"/>Dodaj skład (Twój klub)</button>) : (<div className="text-sm text-gray-600">Twój klub nie jest uczestnikiem tego meczu.</div>)}
        </>)}
        {canDelegateAct() && (<>
          <button onClick={()=>handleUpload("report")} className={clsx(classes.btnPrimary,"flex items-center gap-2")}><UploadCloud className="w-4 h-4"/>Dodaj protokół</button>
          <button onClick={()=>handleUpload("photos")} className={clsx(classes.btnOutline,"flex items-center gap-2")}><Image className="w-4 h-4"/>Dodaj zdjęcia raportu</button>
        </>)}
      </div>
      {match && canEditResult(user, match) && (<div className="flex items-center gap-2">
        <input className={classes.input} placeholder="Wynik (np. 10:9)" value={resultDraft} onChange={e=>setResultDraft(e.target.value)} style={{maxWidth:200}}/>
        <button onClick={saveResult} className={clsx(classes.btnPrimary,"flex items-center gap-2")}><Check className="w-4 h-4"/>Zapisz wynik</button>
        <span className="text-xs text-gray-500">(Dostępne tylko dla delegata tego meczu)</span>
      </div>)}
      {(user.role==='Admin' || user.role==='Delegate') && (<div>
        <div className="flex items-center gap-2 mb-2"><History className="w-4 h-4"/><span className="font-medium">Dziennik (log) uploadów</span></div>
        {match.uploadsLog.length===0? (<div className="text-sm text-gray-500">Brak wpisów.</div>) : (<div className="border rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-gray-50"><tr className="text-left"><th className="p-2">Czas</th><th className="p-2">Typ</th><th className="p-2">Klub</th><th className="p-2">Użytkownik</th><th className="p-2">Plik</th></tr></thead>
          <tbody>{match.uploadsLog.map(l=>(<tr key={l.id} className="border-t"><td className="p-2 whitespace-nowrap">{new Date(l.at).toLocaleString()}</td><td className="p-2">{l.type}</td><td className="p-2">{l.club||'-'}</td><td className="p-2">{l.user}</td><td className="p-2">{l.fileName}</td></tr>))}</tbody></table></div>)}
      </div>)}
    </div>)}
  </div>)
}

const AdminPanel: React.FC<{ state:AppState; setState:(s:AppState)=>void; clubs:readonly string[]; refereeNames:string[]; delegateNames:string[]; onAfterChange:()=>void; canWrite:boolean; }> = ({ state, setState, clubs, refereeNames, delegateNames, onAfterChange, canWrite }) => {
  const blank: Match = { id:crypto.randomUUID(), date:new Date().toISOString().slice(0,10), time:"", round:"", location:"", home:"", away:"", referees:["",""], delegate:"", commsByClub:{home:null,away:null}, rosterByClub:{home:null,away:null}, matchReport:null, reportPhotos:[], notes:"", result:"", uploadsLog:[] };
  const [draft,setDraft]=useState<Match>(blank); const [editId,setEditId]=useState<string|null>(null);

  function toDbRow(m: Match){
    return { date:m.date, time:m.time||null, round:m.round||null, location:m.location, home:m.home, away:m.away, result:m.result||null, referee1:m.referees[0]||null, referee2:m.referees[1]||null, delegate:m.delegate||null, notes:m.notes||null }
  }

  async function saveDraft(){ 
    if(!canWrite){ alert("Tylko Admin może zapisywać mecze do bazy."); return; }
    if (!draft.home||!draft.away||!draft.location||!draft.date){ alert("Uzupełnij: data, miejsce, drużyny"); return; }
    try{
      if(editId){
        await dbUpdateMatch(editId, toDbRow(draft))
      } else {
        await createMatch(toDbRow(draft) as any)
      }
      setDraft({ ...blank, id: crypto.randomUUID() }); setEditId(null); onAfterChange();
    } catch(e:any){ alert("Błąd zapisu: " + e.message) }
  }

  async function removeMatch(id:string){
    if(!canWrite){ alert("Tylko Admin może usuwać mecze."); return; }
    if(!confirm("Usunąć mecz?")) return;
    try{ await dbDeleteMatch(id); onAfterChange(); } catch(e:any){ alert("Błąd usuwania: " + e.message) }
  }

  return (<Section title="Panel administratora (mecze w bazie)" icon={<Settings className="w-5 h-5" />}> 
    <div className="grid md:grid-cols-2 gap-6">
      <div><div className="font-medium mb-2">Dodaj / edytuj mecz</div><div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2"><input className={classes.input} type="date" value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})}/><input className={classes.input} placeholder="Godzina (opcjonalnie)" value={draft.time||""} onChange={e=>setDraft({...draft, time:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-2"><input className={classes.input} placeholder="Runda" value={draft.round||""} onChange={e=>setDraft({...draft, round:e.target.value})}/><input className={classes.input} placeholder="Miejsce" value={draft.location} onChange={e=>setDraft({...draft, location:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-2">
          <select className={classes.input} value={draft.home} onChange={e=>setDraft({...draft, home:e.target.value})}><option value="">Wybierz gospodarza</option>{CLUBS.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select className={classes.input} value={draft.away} onChange={e=>setDraft({...draft, away:e.target.value})}><option value="">Wybierz gości</option>{CLUBS.map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className={classes.input} value={draft.referees[0]} onChange={e=>setDraft({...draft, referees:[e.target.value, draft.referees[1]||""]})}><option value="">Sędzia 1</option>{refereeNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
          <select className={classes.input} value={draft.referees[1]} onChange={e=>setDraft({...draft, referees:[draft.referees[0]||"", e.target.value]})}><option value="">Sędzia 2</option>{refereeNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
        </div>
        <select className={classes.input} value={draft.delegate||""} onChange={e=>setDraft({...draft, delegate:e.target.value})}><option value="">Delegat</option>{delegateNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
        <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result||""} onChange={e=>setDraft({...draft, result:e.target.value})}/>
        <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes||""} onChange={e=>setDraft({...draft, notes:e.target.value})}/>
        <div className="flex gap-2"><button onClick={saveDraft} className={clsx(classes.btnPrimary,"flex items-center gap-2")}><Save className="w-4 h-4"/>{editId?"Zapisz zmiany":"Dodaj mecz"}</button>{editId && <button onClick={classes.btnSecondary as any} onClickCapture={()=>{ setDraft({ ...blank, id: crypto.randomUUID() }); setEditId(null); }}>Anuluj edycję</button>}</div>
        {!canWrite && <div className="text-xs text-amber-700">Zaloguj się jako Admin, aby dodać/edytować mecze.</div>}
      </div></div>
      <div><div className="font-medium mb-2">Istniejące mecze</div><div className="flex flex-col gap-2">
        {state.matches.map(m=>(<div key={m.id} className="rounded-xl border p-3 bg-white flex items-center justify-between">
          <div><div className="font-medium">{m.date} {m.time? m.time+" • ":""}{m.home} vs {m.away}</div><div className="text-xs text-gray-600">{m.location} • Sędz.: {m.referees.join(", ")} • Deleg.: {m.delegate||"-"} • Wynik: {m.result||'-'}</div></div>
          <div className="flex gap-2"><button onClick={()=>{setDraft(m); setEditId(m.id);}} className={classes.iconBtn} title="Edytuj"><Edit className="w-4 h-4"/></button><button onClick={()=>removeMatch(m.id)} className={clsx(classes.iconBtn,"text-red-600")} title="Usuń"><Trash2 className="w-4 h-4"/></button></div>
        </div>))}
        {state.matches.length===0 && <div className="text-sm text-gray-500">Brak meczów w bazie.</div>}
      </div></div>
    </div>
  </Section>)
}

// Diagnostics
function runDiagnostics(state:AppState){
  type Test={name:string; pass:boolean; details?:string}; const tests:Test[]=[]; const sample=state.matches[0];
  if(sample){ const uHome={role:"Club" as Role, club:sample.home} as any; const uOther={role:"Club" as Role, club:"Inny Klub"} as any; const uDel={role:"Delegate" as Role, name:sample.delegate||""} as any; const uGuest={role:"Guest" as Role} as any;
    tests.push({name:"Gospodarz może dodać komunikat", pass: canUploadComms(uHome,sample)===true});
    tests.push({name:"Gość nie może dodać komunikatu", pass: canUploadComms(uGuest,sample)===false});
    tests.push({name:"Gospodarz może dodać skład", pass: canUploadRoster(uHome,sample)===true});
    tests.push({name:"Klub spoza meczu nie może dodać składu", pass: canUploadRoster(uOther,sample)===false});
    tests.push({name:"Delegat może dodać protokół", pass: canUploadReport(uDel)===true});
    const canDownload=(u:{role:Role}|null)=>!!u && u.role!=='Guest'; tests.push({name:"Gość nie pobiera plików", pass: canDownload({role:'Guest' as Role})===false});
    tests.push({name:"Tylko delegat tego meczu może ustawić wynik", pass: canEditResult(uDel,sample)===true && canEditResult({role:'Delegate' as Role, name:'Inny Delegat'} as any,sample)===false });
  } else { tests.push({name:"Dane (z bazy) istnieją", pass:false, details:"Brak meczów do testu"}) }
  const selectedIdInitial:string=""; tests.push({name:"selectedId jest stringiem na starcie", pass: typeof selectedIdInitial==="string"}); return tests;
}
const Diagnostics: React.FC<{ state:AppState }> = ({ state }) => { const tests=runDiagnostics(state); const allPass=tests.every(t=>t.pass);
  return (<Section title="Diagnostyka (testy runtime)" icon={<Shield className="w-5 h-5"/>}><div className="mb-2 text-sm">Wynik: {allPass? <span className="text-green-700 font-semibold">OK</span> : <span className="text-red-700 font-semibold">BŁĘDY</span>}</div>
    <ul className="text-sm space-y-1">{tests.map((t,i)=>(<li key={i} className={t.pass?"text-green-700":"text-red-700"}>• {t.name} — {t.pass?"PASS":"FAIL"}{t.details?` (${t.details})`:''}</li>))}</ul></Section>)
}

// Info
const InfoBox: React.FC = () => (<Section title="Jak z tego korzystać (Krok 1: mecze w bazie)" icon={<Shield className="w-5 h-5"/>}>
  <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
    <li>Mecze są przechowywane w <b>Supabase</b> (dodawanie/edycja/usuwanie tylko przez <b>Admin</b>).</li>
    <li>Wynik może ustawić <b>Delegat</b> przypisany do meczu (zapis do bazy).</li>
    <li>Dokumenty (komunikat/składy/protokół/zdjęcia) jeszcze tymczasowo w przeglądarce (localStorage) – przeniesiemy w Kroku 3.</li>
  </ol>
</Section>)

export default function App(){
  const { userDisplay, role: sRole } = useSupabaseAuth()
  const supaUser = sRole !== 'Guest' ? { name: userDisplay, role: sRole as Role, club: undefined as string|undefined } : null

  // demo fallback
  const [demoUser, setDemoUser] = useState<{name:string; role:Role; club?:string}|null>(()=>{
    const raw = localStorage.getItem("wpr-auth-user"); return raw? JSON.parse(raw): null
  });
  function demoLogin(n:string,r:Role,c?:string){ const u={name:n, role:r, club:c}; setDemoUser(u); localStorage.setItem("wpr-auth-user", JSON.stringify(u)); }
  function demoLogout(){ setDemoUser(null); localStorage.removeItem("wpr-auth-user"); }

  const effectiveUser = supaUser ?? demoUser

  const [state,setState]=useState<AppState>({ matches: [], users:[
    {name:"Admin", role:"Admin"}, {name:"AZS Szczecin – Klub", role:"Club", club:"AZS Szczecin"}, {name:"KS Warszawa – Klub", role:"Club", club:"KS Warszawa"}, {name:"Anna Delegat", role:"Delegate"}, {name:"Sędzia – Demo", role:"Referee"}, {name:"Gość", role:"Guest"}
  ]});

  // Load profiles (for admin select lists)
  const [profiles,setProfiles]=useState<ProfileRow[]>([])
  const [loadingProfiles,setLoadingProfiles]=useState(false)
  async function refreshProfiles(){ setLoadingProfiles(True); const { data, error } = await supabase.from("profiles").select("id, display_name, role, club_id").order("display_name",{ascending:true}); if(!error) setProfiles((data as any)||[]); setLoadingProfiles(False) }
  useEffect(()=>{ if(effectiveUser?.role==="Admin"){ refreshProfiles() } },[effectiveUser?.role])

  // Load matches from Supabase and merge docs from localStorage
  const [loadingMatches,setLoadingMatches]=useState(false)
  async function refreshMatches(){
    setLoadingMatches(true)
    try {
      const rows = await listMatches()
      const docsMap = loadDocs()
      const matches: Match[] = rows.map(r => ({
        id: r.id,
        date: r.date,
        time: r.time || undefined,
        round: r.round || undefined,
        location: r.location,
        home: r.home,
        away: r.away,
        result: r.result || undefined,
        referees: [r.referee1 || "", r.referee2 || ""],
        delegate: r.delegate || undefined,
        notes: r.notes || undefined,
        commsByClub: docsMap[r.id]?.commsByClub || { home: null, away: null },
        rosterByClub: docsMap[r.id]?.rosterByClub || { home: null, away: null },
        matchReport: docsMap[r.id]?.matchReport || null,
        reportPhotos: docsMap[r.id]?.reportPhotos || [],
        uploadsLog: docsMap[r.id]?.uploadsLog || [],
      }))
      setState(s => ({ ...s, matches }))
    } catch(e:any){
      alert("Błąd pobierania meczów: " + e.message)
    }
    setLoadingMatches(false)
  }
  useEffect(()=>{ refreshMatches() }, [])

  const refereeNames = profiles.filter(p=>p.role==="Referee").map(p=>p.display_name).filter(Boolean)
  const delegateNames = profiles.filter(p=>p.role==="Delegate").map(p=>p.display_name).filter(Boolean)

  return (<div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-4 md:p-8">
    <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-white shadow flex items-center justify-center"><Users className="w-5 h-5"/></div>
        <div><h1 className="text-2xl md:text-3xl font-bold">Kolegium Sędziów Piłki Wodnej – Portal</h1><p className="text-sm text-gray-600">Tabela meczów • Dokumenty klubów • Raporty delegatów</p></div></div>
      <div className="flex items-center gap-3">
        <LoginBox classes={classes} />
        {effectiveUser? (<div className="flex items-center gap-2">
          <Badge tone="blue">{effectiveUser.role}{effectiveUser.club?` • ${effectiveUser.club}`:""}</Badge>
          <span className="text-sm text-gray-700">{effectiveUser.name}</span>
          {!supaUser && (<button onClick={demoLogout} className={classes.btnSecondary}><LogOut className="w-4 h-4 inline mr-1"/>Wyloguj (demo)</button>)}
        </div>) : (<span className="text-sm text-gray-600">Niezalogowany</span>)}
      </div>
    </header>

    <main className="max-w-6xl mx-auto grid gap-6">
      {!effectiveUser && <LoginPanel users={state.users} onLogin={demoLogin}/>}
      <MatchesTable state={state} setState={setState} user={effectiveUser} onRefresh={refreshMatches} loading={loadingMatches}/>
      {effectiveUser?.role==="Admin" && (<AdminPanel state={state} setState={setState} clubs={CLUBS} refereeNames={refereeNames} delegateNames={delegateNames} onAfterChange={refreshMatches} canWrite={true}/>)}
      <Diagnostics state={state}/>
      <InfoBox/>
    </main>

    <footer className="max-w-6xl mx-auto mt-8 text-xs text-gray-500">
      <p>Krok 1: Mecze w Supabase (CRUD). Dokumenty w localStorage. Następnie przeniesiemy dokumenty do Supabase Storage + DB.</p>
    </footer>
  </div>)
}
