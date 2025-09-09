import React, { useEffect, useMemo, useState } from "react";
import { Download, Upload, FileText, Users, Shield, Trash2, Edit, LogIn, LogOut, Search, Save, UploadCloud, Image, Settings, Table, History, Check } from "lucide-react";

// ----------------------------------------
// Helpers & UI primitives
// ----------------------------------------
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const classes = {
  input: "w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 shadow",
  btnOutline: "px-3 py-2 rounded-xl border border-sky-600 text-sky-700 bg-white hover:bg-sky-50",
  btnSecondary: "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50",
  iconBtn: "p-2 rounded-lg border bg-white hover:bg-gray-50",
  pill: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white",
};

const Section: React.FC<{ title: string; icon?: React.ReactNode; className?: string }>
  = ({ title, icon, children, className }) => (
  <div className={clsx("bg-white/70 backdrop-blur-sm rounded-2xl shadow p-4 md:p-6", className)}>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; tone?: "gray" | "green" | "blue" | "amber" }>
  = ({ children, tone = "gray" }) => (
  <span className={clsx(
    "px-2 py-0.5 rounded-full text-xs font-medium border",
    tone === "gray" && "bg-gray-50 border-gray-200 text-gray-700",
    tone === "green" && "bg-green-50 border-green-200 text-green-700",
    tone === "blue" && "bg-blue-50 border-blue-200 text-blue-700",
    tone === "amber" && "bg-amber-50 border-amber-200 text-amber-700",
  )}>{children}</span>
);

// ----------------------------------------
// Types
// ----------------------------------------
 type Role = "Guest" | "Club" | "Delegate" | "Admin";

 type StoredFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  uploadedBy: string; // display name
  uploadedAt: string; // ISO
  label?: string; // preferred download name (without extension)
};

 type UploadLog = {
  id: string;
  type: "comms" | "roster" | "protocol" | "photos";
  matchId: string;
  club?: string | null;
  user: string; // display name
  at: string; // ISO
  fileName: string; // original or label
};

 type Match = {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  round?: string;
  location: string;
  home: string;
  away: string;
  result?: string;
  referees: string[]; // [R1, R2]
  delegate?: string;
  commsByClub: Record<string, StoredFile | null>; // {home, away}
  rosterByClub: Record<string, StoredFile | null>; // {home, away}
  matchReport?: StoredFile | null; // delegate upload
  reportPhotos: StoredFile[]; // delegate upload multiple
  notes?: string;
  uploadsLog: UploadLog[]; // audit
};

 type AppState = {
  matches: Match[];
  users: { name: string; role: Role; club?: string }[];
};

// ----------------------------------------
// Storage
// ----------------------------------------
const LS_KEY = "wpr-mvp-app-state-v1";

function loadState(): AppState {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return demoState();
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.matches) return demoState();
    return parsed;
  } catch {
    return demoState();
  }
}

function saveState(state: AppState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function demoState(): AppState {
  const m1: Match = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    time: "18:00",
    round: "1",
    location: "Szczecin – Floating Arena",
    home: "AZS Szczecin",
    away: "KS Warszawa",
    referees: ["Jan Kowalski", "Piotr Nowak"],
    delegate: "Anna Delegat",
    commsByClub: { home: null, away: null },
    rosterByClub: { home: null, away: null },
    reportPhotos: [],
    matchReport: null,
    notes: "Mecz otwarcia sezonu.",
    uploadsLog: [],
  };
  const m2: Match = {
    id: crypto.randomUUID(),
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "13:30",
    round: "1",
    location: "Gdańsk – Morena",
    home: "UKS Gdańsk",
    away: "WTS Poznań",
    referees: ["Kamil Ref", "Łukasz Sędzia"],
    delegate: "Marta Del.",
    commsByClub: { home: null, away: null },
    rosterByClub: { home: null, away: null },
    reportPhotos: [],
    matchReport: null,
    notes: "",
    uploadsLog: [],
  };
  return {
    matches: [m1, m2],
    users: [
      { name: "Admin", role: "Admin" },
      { name: "AZS Szczecin – Klub", role: "Club", club: "AZS Szczecin" },
      { name: "KS Warszawa – Klub", role: "Club", club: "KS Warszawa" },
      { name: "Anna Delegat", role: "Delegate" },
      { name: "Gość", role: "Guest" },
    ],
  };
}

// ----------------------------------------
// Auth (simple local)
// ----------------------------------------
function useAuth() {
  const [user, setUser] = useState<{ name: string; role: Role; club?: string } | null>(() => {
    const raw = localStorage.getItem("wpr-auth-user");
    return raw ? JSON.parse(raw) : null;
  });
  function login(name: string, role: Role, club?: string) {
    const u = { name, role, club };
    setUser(u);
    localStorage.setItem("wpr-auth-user", JSON.stringify(u));
  }
  function logout() {
    setUser(null);
    localStorage.removeItem("wpr-auth-user");
  }
  return { user, login, logout } as const;
}

// ----------------------------------------
// Files
// ----------------------------------------
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function toStoredFile(file: File, uploadedBy: string, label: string): Promise<StoredFile> {
  const dataUrl = await fileToDataUrl(file);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    label,
  };
}

function downloadDataUrl(file: StoredFile) {
  const a = document.createElement("a");
  a.href = file.dataUrl;
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  a.download = file.label ? `${file.label}${ext}` : file.name;
  a.click();
}

const DocBadge: React.FC<{file: StoredFile; label: string; disabled?: boolean}> = ({ file, label, disabled }) => (
  <button onClick={()=>{ if(disabled){ alert("Pobieranie dostępne po zalogowaniu (nie dla Gościa)."); return; } downloadDataUrl(file); }} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white ${disabled? 'opacity-50 cursor-not-allowed' : 'hover:shadow'}`}>
    <FileText className="w-3.5 h-3.5"/>{label}
  </button>
);

// ----------------------------------------
// Permission helpers (also used in diagnostics)
// ----------------------------------------
function canUploadComms(user: {role:Role; club?:string}, match: Match) {
  return user.role === "Club" && !!user.club && user.club === match.home;
}
function canUploadRoster(user: {role:Role; club?:string}, match: Match) {
  return user.role === "Club" && !!user.club && (user.club === match.home || user.club === match.away);
}
function canUploadReport(user: {role:Role}) { return user.role === "Delegate"; }
function canEditResult(user: {role:Role; name:string}, match: Match) {
  // Only the assigned delegate of this match OR Admin in AdminPanel (already allowed there)
  return user.role === "Delegate" && !!match.delegate && match.delegate === user.name;
}

// ----------------------------------------
// Components
// ----------------------------------------
const LoginPanel: React.FC<{
  users: AppState["users"]; onLogin: (n: string, r: Role, c?: string) => void;
}> = ({ users, onLogin }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Guest");
  const [club, setClub] = useState("");

  return (
    <Section title="Zaloguj się" icon={<LogIn className="w-5 h-5" />}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="mb-2 font-medium">Szybki wybór (demo)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {users.map((u) => (
              <button key={u.name}
                onClick={() => onLogin(u.name, u.role, u.club)}
                className={clsx(classes.btnSecondary, "text-left")}
              >
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-gray-600">Rola: {u.role}{u.club ? ` • ${u.club}` : ""}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 font-medium">Własny użytkownik</div>
          <div className="flex flex-col gap-2">
            <input className={classes.input} placeholder="Imię i nazwisko / nazwa" value={name} onChange={(e)=>setName(e.target.value)} />
            <div className="flex gap-2">
              <select className={classes.input} value={role} onChange={(e)=>setRole(e.target.value as Role)}>
                {(["Guest","Club","Delegate","Admin"] as Role[]).map(r=> <option key={r}>{r}</option>)}
              </select>
              <input className={classes.input} placeholder="Klub (dla roli Club)" value={club} onChange={(e)=>setClub(e.target.value)} />
            </div>
            <button
              onClick={()=> name && onLogin(name, role, club || undefined)}
              className={classes.btnPrimary}
            >Zaloguj</button>
          </div>
        </div>
      </div>
    </Section>
  );
};

const ExportImport: React.FC<{state: AppState; setState:(s:AppState)=>void}> = ({ state, setState }) => {
  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wpr-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }
  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const parsed = JSON.parse(text) as AppState;
      setState(parsed);
      saveState(parsed);
    } catch {
      alert("Niepoprawny plik JSON.");
    }
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={exportJSON} className={clsx(classes.btnSecondary, "flex items-center gap-2")}><Download className="w-4 h-4"/>Eksport</button>
      <label className={clsx(classes.btnSecondary, "inline-flex items-center gap-2 cursor-pointer")}>
        <Upload className="w-4 h-4"/>Import
        <input type="file" accept="application/json" className="hidden" onChange={importJSON}/>
      </label>
    </div>
  );
};

const MatchesTable: React.FC<{
  state: AppState; setState: (s: AppState)=>void; user: {name:string; role:Role; club?:string} | null;
}> = ({ state, setState, user }) => {
  const [q, setQ] = useState("");
  const filtered = useMemo(()=> state.matches.filter(m => {
    const t = [m.home, m.away, m.location, m.round, m.result, m.delegate, ...m.referees].join(" ").toLowerCase();
    return t.includes(q.toLowerCase());
  }), [state.matches, q]);

  const canDownload = !!user && user.role !== 'Guest';

  return (
    <Section title="Tabela meczów" icon={<Table className="w-5 h-5" />}>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input value={q} onChange={(e)=>setQ(e.target.value)} className={clsx(classes.input, "pl-9")} placeholder="Szukaj po drużynie, miejscu, sędziach..."/>
        </div>
        <ExportImport state={state} setState={setState}/>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-50">
              <th className="p-2">Data</th>
              <th className="p-2">Runda</th>
              <th className="p-2">Miejsce</th>
              <th className="p-2">Gospodarz</th>
              <th className="p-2">Goście</th>
              <th className="p-2">Wynik</th>
              <th className="p-2">Sędziowie</th>
              <th className="p-2">Delegat</th>
              <th className="p-2">Dokumenty</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b hover:bg-gray-50/60">
                <td className="p-2 whitespace-nowrap">{m.date}{m.time ? ` ${m.time}` : ""}</td>
                <td className="p-2 whitespace-nowrap">{m.round ?? "-"}</td>
                <td className="p-2">{m.location}</td>
                <td className="p-2">{m.home}</td>
                <td className="p-2">{m.away}</td>
                <td className="p-2">{m.result ?? "-"}</td>
                <td className="p-2">{m.referees.join(", ")}</td>
                <td className="p-2">{m.delegate ?? "-"}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    {m.commsByClub.home && <DocBadge file={m.commsByClub.home} label="Komunikat" disabled={!canDownload}/>}
                    {m.rosterByClub.home && <DocBadge file={m.rosterByClub.home} label="Skład (Home)" disabled={!canDownload}/>}
                    {m.rosterByClub.away && <DocBadge file={m.rosterByClub.away} label="Skład (Away)" disabled={!canDownload}/>}
                    {m.matchReport && <DocBadge file={m.matchReport} label="Protokół" disabled={!canDownload}/>}
                    {m.reportPhotos.length>0 && (
                      <span className={classes.pill}><Image className="w-3.5 h-3.5"/>Zdjęcia: {m.reportPhotos.length}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {user && user.role !== "Guest" && (
        <div className="mt-6">
          <PerMatchActions state={state} setState={setState} user={user}/>
        </div>
      )}
    </Section>
  );
};

const PerMatchActions: React.FC<{
  state: AppState; setState: (s:AppState)=>void; user:{name:string;role:Role;club?:string}
}> = ({ state, setState, user }) => {
  const [selectedId, setSelectedId] = useState<string>(state.matches[0]?.id ?? ""); // always a string
  const match = state.matches.find(m=> m.id===selectedId) || null;
  const [resultDraft, setResultDraft] = useState<string>(match?.result || "");
  useEffect(()=>{ setResultDraft(match?.result || ""); }, [selectedId]);

  function pushLog(next: Match, entry: Omit<UploadLog, "id"|"matchId"|"at">) {
    next.uploadsLog = [
      { id: crypto.randomUUID(), matchId: next.id, at: new Date().toISOString(), ...entry },
      ...next.uploadsLog
    ];
  }

  async function handleUpload(type: "comms"|"roster"|"report"|"photos") {
    if (!match) return;
    const input = document.createElement("input");
    input.type = "file";
    if (type === "photos") input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;
      const next = { ...match } as Match;
      if (type === "comms" || type === "roster") {
        if (user.role !== "Club" || !user.club) { alert("Ta akcja jest dostępna tylko dla roli Klub (z ustawioną nazwą klubu)."); return; }
        const key = user.club === match.home ? "home" : user.club === match.away ? "away" : null;
        if (!key) { alert("Twój klub nie jest przypisany do tego meczu."); return; }
        if (type === "comms") {
          if (!canUploadComms(user, match)) { alert("Komunikat może dodać wyłącznie gospodarz meczu."); return; }
          const sf = await toStoredFile(files[0], user.name, `Komunikat - ${match.home} - ${match.date}`);
          next.commsByClub[key] = sf; // nadpisanie komunikatu gospodarza
          pushLog(next, { type: 'comms', club: user.club, user: user.name, fileName: sf.name });
        } else {
          if (!canUploadRoster(user, match)) { alert("Skład może dodać tylko klub biorący udział w meczu."); return; }
          const clubName = key === "home" ? match.home : match.away;
          const sf = await toStoredFile(files[0], user.name, `Skład - ${clubName} - ${match.date}`);
          next.rosterByClub[key] = sf;
          pushLog(next, { type: 'roster', club: user.club, user: user.name, fileName: sf.name });
        }
      }
      if (type === "report") {
        if (!canUploadReport(user)) { alert("Protokół może dodać tylko Delegat."); return; }
        const sf = await toStoredFile(files[0], user.name, `Protokół - ${match.home} vs ${match.away} - ${match.date}`);
        next.matchReport = sf;
        pushLog(next, { type: 'protocol', club: null, user: user.name, fileName: sf.name });
      }
      if (type === "photos") {
        if (!canUploadReport(user)) { alert("Zdjęcia raportu może dodać tylko Delegat."); return; }
        const sfs: StoredFile[] = [];
        for (const f of files) sfs.push(await toStoredFile(f, user.name, "Zdjęcie raportu"));
        next.reportPhotos = [...next.reportPhotos, ...sfs];
        // agregujemy jako jeden wpis
        pushLog(next, { type: 'photos', club: null, user: user.name, fileName: `${files.length} zdjęć` });
      }
      const newState = { ...state, matches: state.matches.map(m => m.id===match.id ? next : m) };
      setState(newState); saveState(newState);
    };
    input.click();
  }

  function saveResult() {
    if (!match) return;
    if (!canEditResult(user, match)) { alert("Wynik może ustawić tylko delegat tego meczu."); return; }
    const next = { ...match, result: resultDraft } as Match;
    const newState = { ...state, matches: state.matches.map(m => m.id===match.id ? next : m) };
    setState(newState); saveState(newState);
  }

  function canClubAct(): boolean { return user.role === "Club" && !!user.club; }
  function canDelegateAct(): boolean { return user.role === "Delegate"; }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Wybierz mecz:</span>
        <select className={classes.input} value={selectedId} onChange={(e)=>setSelectedId(e.target.value)}>
          {state.matches.map(m => (
            <option key={m.id} value={m.id}>{m.date} {m.time ? m.time+" • ":""}{m.home} vs {m.away}</option>
          ))}
        </select>
      </div>

      {match && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {canClubAct() && (
              <>
                {canUploadComms(user, match) && (
                  <button onClick={()=>handleUpload("comms")} className={clsx(classes.btnOutline, "flex items-center gap-2")}><UploadCloud className="w-4 h-4"/>Dodaj komunikat (Gospodarz)</button>
                )}
                {canUploadRoster(user, match) ? (
                  <button onClick={()=>handleUpload("roster")} className={clsx(classes.btnOutline, "flex items-center gap-2")}><UploadCloud className="w-4 h-4"/>Dodaj skład (Twój klub)</button>
                ) : (
                  <div className="text-sm text-gray-600">Twój klub nie jest uczestnikiem tego meczu.</div>
                )}
              </>
            )}
            {canDelegateAct() && (
              <>
                <button onClick={()=>handleUpload("report")} className={clsx(classes.btnPrimary, "flex items-center gap-2")}><UploadCloud className="w-4 h-4"/>Dodaj protokół</button>
                <button onClick={()=>handleUpload("photos")} className={clsx(classes.btnOutline, "flex items-center gap-2")}><Image className="w-4 h-4"/>Dodaj zdjęcia raportu</button>
              </>
            )}
          </div>

          {/* Delegat może wpisać wynik tylko w swoim meczu */}
          {match && canEditResult(user, match) && (
            <div className="flex items-center gap-2">
              <input className={classes.input} placeholder="Wynik (np. 10:9)" value={resultDraft} onChange={(e)=>setResultDraft(e.target.value)} style={{maxWidth: 200}}/>
              <button onClick={saveResult} className={clsx(classes.btnPrimary, "flex items-center gap-2")}><Check className="w-4 h-4"/>Zapisz wynik</button>
              <span className="text-xs text-gray-500">(Dostępne tylko dla delegata tego meczu)</span>
            </div>
          )}

          {/* Log uploadów – widoczne dla Admina i Delegata */}
          {(user.role === 'Admin' || user.role === 'Delegate') && (
            <div>
              <div className="flex items-center gap-2 mb-2"><History className="w-4 h-4"/><span className="font-medium">Dziennik (log) uploadów</span></div>
              {match.uploadsLog.length === 0 ? (
                <div className="text-sm text-gray-500">Brak wpisów.</div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="p-2">Czas</th>
                        <th className="p-2">Typ</th>
                        <th className="p-2">Klub</th>
                        <th className="p-2">Użytkownik</th>
                        <th className="p-2">Plik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.uploadsLog.map((l)=> (
                        <tr key={l.id} className="border-t">
                          <td className="p-2 whitespace-nowrap">{new Date(l.at).toLocaleString()}</td>
                          <td className="p-2">{l.type}</td>
                          <td className="p-2">{l.club || '-'}</td>
                          <td className="p-2">{l.user}</td>
                          <td className="p-2">{l.fileName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminPanel: React.FC<{ state: AppState; setState:(s:AppState)=>void; }> = ({ state, setState }) => {
  const blank: Match = {
    id: crypto.randomUUID(), date: new Date().toISOString().slice(0,10), time: "",
    round: "", location: "", home: "", away: "", referees: ["",""],
    delegate: "", commsByClub: {home:null, away:null}, rosterByClub: {home:null, away:null},
    matchReport: null, reportPhotos: [], notes: "", result: "", uploadsLog: [],
  };
  const [draft, setDraft] = useState<Match>(blank);
  const [editId, setEditId] = useState<string | null>(null);

  function resetDraft() { setDraft({ ...blank, id: crypto.randomUUID() }); setEditId(null); }

  function saveDraft() {
    if (!draft.home || !draft.away || !draft.location || !draft.date) { alert("Uzupełnij: data, miejsce, drużyny"); return; }
    let matches: Match[];
    if (editId) {
      matches = state.matches.map(m => m.id===editId ? draft : m);
    } else {
      matches = [draft, ...state.matches];
    }
    const newState = { ...state, matches };
    setState(newState); saveState(newState); resetDraft();
  }

  function editMatch(m: Match) { setDraft(m); setEditId(m.id); }
  function removeMatch(id: string) {
    if (!confirm("Usunąć mecz?")) return;
    const matches = state.matches.filter(m => m.id!==id);
    const newState = { ...state, matches };
    setState(newState); saveState(newState);
  }

  return (
    <Section title="Panel administratora" icon={<Settings className="w-5 h-5" />}> 
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="font-medium mb-2">Dodaj / edytuj mecz</div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input className={classes.input} type="date" value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})}/>
              <input className={classes.input} placeholder="Godzina (opcjonalnie)" value={draft.time||""} onChange={e=>setDraft({...draft, time:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={classes.input} placeholder="Runda" value={draft.round||""} onChange={e=>setDraft({...draft, round:e.target.value})}/>
              <input className={classes.input} placeholder="Miejsce" value={draft.location} onChange={e=>setDraft({...draft, location:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={classes.input} placeholder="Gospodarz" value={draft.home} onChange={e=>setDraft({...draft, home:e.target.value})}/>
              <input className={classes.input} placeholder="Goście" value={draft.away} onChange={e=>setDraft({...draft, away:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={classes.input} placeholder="Sędzia 1" value={draft.referees[0]} onChange={e=>setDraft({...draft, referees:[e.target.value, draft.referees[1]||""]})}/>
              <input className={classes.input} placeholder="Sędzia 2" value={draft.referees[1]} onChange={e=>setDraft({...draft, referees:[draft.referees[0]||"", e.target.value]})}/>
            </div>
            <input className={classes.input} placeholder="Delegat" value={draft.delegate||""} onChange={e=>setDraft({...draft, delegate:e.target.value})}/>
            <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result||""} onChange={e=>setDraft({...draft, result:e.target.value})}/>
            <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes||""} onChange={e=>setDraft({...draft, notes:e.target.value})}/>
            <div className="flex gap-2">
              <button onClick={saveDraft} className={clsx(classes.btnPrimary, "flex items-center gap-2")}><Save className="w-4 h-4"/>{editId?"Zapisz zmiany":"Dodaj mecz"}</button>
              {editId && <button onClick={classes.btnSecondary as any} onClickCapture={resetDraft}>Anuluj edycję</button>}
            </div>
          </div>
        </div>
        <div>
          <div className="font-medium mb-2">Istniejące mecze</div>
          <div className="flex flex-col gap-2">
            {state.matches.map((m)=> (
              <div key={m.id} className="rounded-xl border p-3 bg-white flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.date} {m.time? m.time+" • ":""}{m.home} vs {m.away}</div>
                  <div className="text-xs text-gray-600">{m.location} • Sędz.: {m.referees.join(", ")} • Deleg.: {m.delegate||"-"} • Wynik: {m.result||'-'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{setDraft(m); setEditId(m.id);}} className={classes.iconBtn} title="Edytuj"><Edit className="w-4 h-4"/></button>
                  <button onClick={()=>removeMatch(m.id)} className={clsx(classes.iconBtn, "text-red-600")} title="Usuń"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

// ----------------------------------------
// Diagnostics (simple runtime tests)
// ----------------------------------------
function runDiagnostics(state: AppState) {
  type Test = { name: string; pass: boolean; details?: string };
  const tests: Test[] = [];
  const sample = state.matches[0];
  if (sample) {
    const uHome = { role: "Club" as Role, club: sample.home } as any;
    const uAway = { role: "Club" as Role, club: sample.away } as any;
    const uOther = { role: "Club" as Role, club: "Inny Klub" } as any;
    const uDel = { role: "Delegate" as Role, name: sample.delegate || "" } as any;
    const uGuest = { role: "Guest" as Role } as any;
    tests.push({ name: "Gospodarz może dodać komunikat", pass: canUploadComms(uHome, sample) === true });
  } else {
    tests.push({ name: "Dane demo istnieją", pass: false, details: "Brak meczów w stanie aplikacji" });
  }
  const selectedIdInitial: string = "";
  tests.push({ name: "selectedId jest stringiem na starcie", pass: typeof selectedIdInitial === "string" });
  return tests;
}

const Diagnostics: React.FC<{ state: AppState }> = ({ state }) => {
  const tests = runDiagnostics(state);
  const allPass = tests.every(t => t.pass);
  return (
    <Section title="Diagnostyka (testy runtime)" icon={<Shield className="w-5 h-5"/>}>
      <div className="mb-2 text-sm">Wynik: {allPass ? <span className="text-green-700 font-semibold">OK</span> : <span className="text-red-700 font-semibold">BŁĘDY</span>}</div>
      <ul className="text-sm space-y-1">
        {tests.map((t, i) => (
          <li key={i} className={t.pass?"text-green-700":"text-red-700"}>• {t.name} — {t.pass?"PASS":"FAIL"}{t.details?` (${t.details})`:''}</li>
        ))}
      </ul>
    </Section>
  );
};

// ----------------------------------------
// Info
// ----------------------------------------
const InfoBox: React.FC = () => (
  <Section title="Jak z tego korzystać (MVP)" icon={<Shield className="w-5 h-5"/>}>
    <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
      <li><b>Logowanie (demo):</b> U góry kliknij „Zaloguj się” i wybierz użytkownika (np. <i>Admin</i>, <i>AZS Szczecin – Klub</i>, <i>Anna Delegat</i>) albo utwórz własnego.</li>
      <li><b>Widok gościa:</b> każdy widzi tabelę i listy dokumentów, ale pobieranie plików jest dostępne <b>tylko po zalogowaniu</b> (nie dla Gościa).</li>
      <li><b>Rola Klub:</b> możesz dodać <i>Komunikat</i> <b>tylko jako gospodarz</b> oraz <i>Skład</i> <b>tylko gdy Twój klub gra</b>.</li>
      <li><b>Rola Delegat:</b> dodasz <i>Protokół</i> i <i>Zdjęcia raportu</i>, a także <b>ustawisz wynik</b> <i>tylko we własnym meczu</i>.</li>
      <li><b>Rola Admin:</b> w panelu administratora dodajesz/edytujesz mecze, sędziów i delegata, wynik.</li>
      <li><b>Kopia zapasowa:</b> w tabeli meczów po prawej jest <i>Eksport/Import</i> – zapis do JSON i wczytanie danych.</li>
      <li><b>Uwaga:</b> wszystko zapisane w <i>localStorage</i> Twojej przeglądarki.</li>
    </ol>
  </Section>
);

// ----------------------------------------
// Root App
// ----------------------------------------
export default function App() {
  const { user, login, logout } = useAuth();
  const [state, setState] = useState<AppState>(()=>loadState());
  useEffect(()=>{ saveState(state); }, [state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white shadow flex items-center justify-center">
            <Users className="w-5 h-5"/>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Kolegium Sędziów Piłki Wodnej – Portal</h1>
            <p className="text-sm text-gray-600">Tabela meczów • Dokumenty klubów • Raporty delegatów</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Badge tone="blue">{user.role}{user.club?` • ${user.club}`:""}</Badge>
              <span className="text-sm text-gray-700">{user.name}</span>
              <button onClick={logout} className={classes.btnSecondary}><LogOut className="w-4 h-4 inline mr-1"/>Wyloguj</button>
            </div>
          ) : (
            <span className="text-sm text-gray-600">Niezalogowany</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid gap-6">
        {!user && <LoginPanel users={state.users} onLogin={login}/>}      
        <MatchesTable state={state} setState={setState} user={user}/>
        {user?.role === "Admin" && <AdminPanel state={state} setState={setState}/>} 
        <Diagnostics state={state}/>
        <InfoBox/>
      </main>

      <footer className="max-w-6xl mx-auto mt-8 text-xs text-gray-500">
        <p>Prototyp działa w 100% po stronie przeglądarki (localStorage). Do produkcji zalecam: Vercel (hosting) + Supabase (Auth, DB, Storage).</p>
      </footer>
    </div>
  );
}
