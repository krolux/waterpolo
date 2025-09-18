/* App with Supabase CRUD for matches (Step 1) + docs kept in localStorage */
import React, { useEffect, useMemo, useState, PropsWithChildren } from "react";
import { Download, Upload, FileText, Users, Shield, Trash2, Edit, LogIn, LogOut, Search, Save, UploadCloud, Image, Settings, Table, Check, RefreshCw } from "lucide-react";
import { useSupabaseAuth, Role as SupaRole } from './hooks/useSupabaseAuth'
import { LoginBox } from './components/LoginBox'
import { supabase } from "./lib/supabase"
import { listMatches, createMatch, updateMatch as dbUpdateMatch, deleteMatch as dbDeleteMatch, setMatchResult } from './lib/matches'
import { addPenalty, listPenalties, deletePenalty, type Penalty } from "./lib/penalties";
import { uploadDoc, getSignedUrl } from "./lib/storage";
import { uploadImportCSV, triggerBulkImport } from "./lib/imports";



function clsx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }

const classes = {
  input: "w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow",
  btnOutline: "px-3 py-2 rounded-xl border border-amber-600 text-amber-700 bg-white hover:bg-amber-50",
  btnSecondary: "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50",
  iconBtn: "p-2 rounded-lg border bg-white hover:bg-gray-50",
  pill: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white",
};

const HorizontalScroller: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className={clsx("w-full overflow-x-auto", className)}
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x pinch-zoom",
        overscrollBehaviorX: "contain",
      }}
    >
      {children}
    </div>
  );
};

type Role = SupaRole;
type SectionProps = PropsWithChildren<{ title: string; icon?: React.ReactNode; className?: string }>;
const Section: React.FC<SectionProps> = ({ title, icon, children, className }) => (
  <div
    className={clsx(
      "rounded-2xl p-3 sm:p-4 md:p-6",
      "bg-white/50 backdrop-blur-xl backdrop-saturate-150",
      "border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
      className
    )}
  >
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
    </div>
    {children}
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
type StoredFile = { id:string; name:string; mime:string; size:number; path:string; uploadedBy:string; uploadedAt:string; label?:string; };
type UploadLog = { id:string; type:"comms"|"roster"|"protocol"|"photos"; matchId:string; club?:string|null; user:string; at:string; fileName:string; };
type Match = {
  id: string;
  date: string;
  time?: string;
  round?: string;
  location: string;
  home: string;
  away: string;
  result?: string;
  shootout?: boolean;               // <— NOWE
  referees: string[];
  delegate?: string;
  commsByClub: Record<string, StoredFile | null>;
  rosterByClub: Record<string, StoredFile | null>;
  matchReport?: StoredFile | null;
  reportPhotos: StoredFile[];
  notes?: string;
  uploadsLog: UploadLog[];
};
type AppState = { matches: Match[]; users:{name:string; role:Role; club?:string}[]; };
type ProfileRow = {
  id: string;
  display_name: string;
  role: Role;
  club_id: string | null;
  club_name?: string | null;
};







// Files helpers
async function toStoredFileUsingStorage(kind: "comms"|"roster"|"report"|"photos", matchId: string, clubOrNeutral: string, file: File, uploadedBy: string, label: string): Promise<StoredFile> {
  const path = await uploadDoc(kind, matchId, clubOrNeutral, file);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    path,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    label,
  };
}

async function downloadStoredFile(file: StoredFile) {
const url = await getSignedUrl(file.path);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.label ? file.label : file.name;
  a.click();
}

// Badge do pobierania dokumentów z Supabase Storage (podpisywane URL)
const DocBadge: React.FC<{ file: StoredFile; label: string; disabled?: boolean }> = ({
  file,
  label,
  disabled,
}) => (
  <button
    onClick={() => {
      if (disabled) {
        alert("Pobieranie dostępne po zalogowaniu (nie dla Gościa).");
        return;
      }
      downloadStoredFile(file);
    }}
    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white ${
      disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow"
    }`}
    title={label}
  >
    <FileText className="w-3.5 h-3.5" />
    {label}
  </button>
);


// Permissions
function canUploadComms(user:{role:Role;club?:string}, m:Match){ return user.role==="Club" && !!user.club && user.club===m.home }
function canUploadRoster(user:{role:Role;club?:string}, m:Match){ return user.role==="Club" && !!user.club && (user.club===m.home || user.club===m.away) }
function canUploadReport(user:{role:Role}){ return user.role==="Delegate" }
function canEditResult(user:{role:Role;name:string}, m:Match){ return user.role==="Delegate" && !!m.delegate && m.delegate===user.name }


// Components
const LoginPanel: React.FC<{ users: AppState["users"]; onLogin: (n: string, r: Role, c?: string) => void; }> = ({ users, onLogin }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Guest");
  const [club, setClub] = useState("");

  // Tu już nic nie renderujemy (mail/hasło jest w <LoginBox/> w nagłówku).
  // Zostawiamy pustą sekcję, żeby nie psuć reszty struktury.
  return (
    <Section title="Zaloguj się" icon={<LogIn className="w-5 h-5" />}>
      {/* celowo pusto – logowanie jest przez LoginBox */}
    </Section>
  );
};



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

const MatchesTable: React.FC<{
  state: AppState;
  setState: (s: AppState) => void;
  user: { name: string; role: Role; club?: string } | null;
  onRefresh: () => void;
  loading: boolean;
  penaltyMap: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
  onRemovePenalty: (id: string) => void;
  title?: string;
  sectionClassName?: string;
  showExport?: boolean;
  variant?: "upcoming" | "finished";
}> = ({
  state,
  setState,
  user,
  onRefresh,
  loading,
  penaltyMap,
  onRemovePenalty,
  title = "Tabela meczów",
  sectionClassName,
  showExport = false,
  variant = "upcoming",
}) => {
const [q, setQ] = useState("");
const [sortKey, setSortKey] = useState<"date" | "round">("round");
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Kolory kart i paskowanie w zależności od wariantu
  const cardBg =
    variant === "finished"
      ? "bg-[#e6f0ff] border-[#bcd4ff]"   // zakończone: jasny błękit
      : "bg-white border-sky-100";        // nadchodzące: biały

  const rowStriping =
    variant === "finished"
      ? "odd:bg-[#e6f0ff]/70 even:bg-[#d9e8ff]/70" // zakończone: błękitne pasy
      : "odd:bg-white even:bg-slate-50/60";        // nadchodzące: jak było

const sorted = useMemo(() => {
  const arr = [...state.matches];

  arr.sort((a, b) => {
    if (sortKey === "date") {
      const A = (a.date || "");
      const B = (b.date || "");
      const cmp = A.localeCompare(B);
      return sortDir === "asc" ? cmp : -cmp;
    }

    const An = Number((a.round || "").toString().trim());
    const Bn = Number((b.round || "").toString().trim());
    const aIsNum = Number.isFinite(An);
    const bIsNum = Number.isFinite(Bn);

    let cmp = 0;
    if (aIsNum && bIsNum) cmp = An - Bn;
    else if (aIsNum && !bIsNum) cmp = -1;
    else if (!aIsNum && bIsNum) cmp = 1;
    else cmp = (a.round || "").localeCompare(b.round || "");

    return sortDir === "asc" ? cmp : -cmp;
  });

  return arr;
}, [state.matches, sortKey, sortDir]);

  const filtered = useMemo(
    () =>
      sorted.filter((m) =>
        [m.home, m.away, m.location, m.round, m.result, m.delegate, ...m.referees]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      ),
    [sorted, q]
  );

  const canDownload = !!user && user.role !== "Guest";
function renderResult(m: Match) {
  const r = (m.result || "").trim();
  if (!r) return "-";
  if (!m.shootout) return r;

  const [aStr, bStr] = r.split(":");
  const a = parseInt(aStr, 10);
  const b = parseInt(bStr, 10);
  if (Number.isFinite(a) && Number.isFinite(b)) {
    if (a > b) return `k${a}:${b}`;
    if (b > a) return `${a}:${b}k`;
  }
  return r;
}
  return (
  <Section title={title} icon={<Table className="w-5 h-5" />} className={sectionClassName}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={clsx(classes.input, "pl-9")}
            placeholder="Szukaj po drużynie, miejscu, sędziach..."
          />
        </div>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as "date" | "round")}
          className={classes.input}
          style={{ maxWidth: 170 }}
          title="Sortuj wg…"
        >
          <option value="date">Sortuj wg daty</option>
          <option value="round">Sortuj wg nr meczu</option>
        </select>

        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className={clsx(classes.btnSecondary, "px-2")}
          title={sortDir === "asc" ? "Kierunek: rosnąco" : "Kierunek: malejąco"}
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>

        <button
          onClick={onRefresh}
          className={clsx(classes.btnSecondary, "flex items-center gap-2")}
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          Odśwież
        </button>

{showExport && user && user.role !== "Guest" && (
  <ExportImport state={state} setState={setState} />
)}
      </div>

{filtered.length === 0 && (
  <div className="text-sm text-gray-600">
    Brak meczów do wyświetlenia.
  </div>
)}

{/* MOBILE: karty */}
<div className="md:hidden space-y-3">
  {filtered.map((m) => {
    const homePens = penaltyMap.get(m.id)?.home || [];
    const awayPens  = penaltyMap.get(m.id)?.away || [];
    return (
    <div key={m.id} className={clsx("rounded-xl border p-3 shadow-sm", cardBg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 truncate">
              {m.date}{m.time ? ` ${m.time}` : ""} • {m.location}
            </div>
            <div className="font-medium break-words">{m.home} vs {m.away}</div>
            <div className="text-xs text-gray-600 break-words">
              Sędziowie: {m.referees.filter(Boolean).join(", ") || "–"}
              {m.delegate ? ` • Delegat: ${m.delegate}` : ""}
            </div>
          </div>
          <div className="text-right text-sm font-semibold shrink-0">
            {renderResult(m)}
          </div>
        </div>

        {/* Kary – tylko dla zalogowanych */}
        <div className="mt-2 grid grid-cols-1 gap-2">
          <div className="text-xs">
            <span className="font-semibold">Kary (Gospodarz): </span>
            {user?.role === "Guest" ? (
              <span className="text-gray-500">–</span>
            ) : homePens.length === 0 ? (
              <span className="text-gray-500">–</span>
            ) : (
              <span className="inline-flex flex-wrap gap-1 align-top">
                {homePens.map(p => (
                  <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                    {p.name}
                    {(user?.role === 'Admin' || user?.role === 'Delegate') && (
                      <button onClick={() => onRemovePenalty(p.id)} className="ml-1 rounded px-1 leading-none hover:bg-red-100" title="Usuń karę">×</button>
                    )}
                  </span>
                ))}
              </span>
            )}
          </div>

          <div className="text-xs">
            <span className="font-semibold">Kary (Goście): </span>
            {user?.role === "Guest" ? (
              <span className="text-gray-500">–</span>
            ) : awayPens.length === 0 ? (
              <span className="text-gray-500">–</span>
            ) : (
              <span className="inline-flex flex-wrap gap-1 align-top">
                {awayPens.map(p => (
                  <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                    {p.name}
                    {(user?.role === 'Admin' || user?.role === 'Delegate') && (
                      <button onClick={() => onRemovePenalty(p.id)} className="ml-1 rounded px-1 leading-none hover:bg-red-100" title="Usuń karę">×</button>
                    )}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {/* Dokumenty */}
        <div className="mt-2 flex flex-wrap gap-2">
          {m.commsByClub.home && <DocBadge file={m.commsByClub.home} label="Komunikat" disabled={!canDownload} />}
          {m.rosterByClub.home && <DocBadge file={m.rosterByClub.home} label="Skład (Home)" disabled={!canDownload} />}
          {m.rosterByClub.away && <DocBadge file={m.rosterByClub.away} label="Skład (Away)" disabled={!canDownload} />}
          {m.matchReport && <DocBadge file={m.matchReport} label="Protokół" disabled={!canDownload} />}
          {m.reportPhotos.length > 0 && (
            <span className={classes.pill}><Image className="w-3.5 h-3.5" />Zdjęcia: {m.reportPhotos.length}</span>
          )}
        </div>
      </div>
    );
  })}
</div>

{/* DESKTOP: tabela bez scrolla, węższe kolumny + zawijanie */}
<div className="hidden md:block">
  <table className="table-auto w-full text-xs sm:text-sm">
    <thead className="bg-white">
      <tr className="text-left border-b">
        <th className="px-2 py-1 whitespace-nowrap w-[90px] text-center">Data</th>
        <th className="px-2 py-1 whitespace-nowrap w-[64px] text-center">Nr</th>
        <th className="px-2 py-1 break-words w-[120px]">Miejsce</th>
        <th className="px-2 py-1 break-words w-[150px]">Gospodarz</th>
        <th className="px-2 py-1 break-words w-[150px]">Goście</th>
        <th className="px-2 py-1 whitespace-nowrap w-[72px] text-center">Wynik</th>
        <th className="px-2 py-1 break-words w-[160px]">Sędziowie</th>
        <th className="px-2 py-1 break-words w-[120px]">Delegat</th>
        <th className="px-2 py-1 break-words w-[140px]">Kary (Gospodarz)</th>
        <th className="px-2 py-1 break-words w-[140px]">Kary (Goście)</th>
        <th className="px-2 py-1 break-words w-[140px]">Dokumenty</th>
      </tr>
    </thead>

    <tbody>
      {filtered.map((m) => (
      <tr key={m.id} className={clsx("border-b hover:bg-sky-50 transition-colors align-top", rowStriping)}>
          <td className="px-2 py-1 whitespace-nowrap text-center">{m.date}{m.time ? ` ${m.time}` : ""}</td>
          <td className="px-2 py-1 whitespace-nowrap text-center">{m.round ?? "-"}</td>
          <td className="px-2 py-1 break-words">{m.location}</td>
          <td className="px-2 py-1 break-words">{m.home}</td>
          <td className="px-2 py-1 break-words">{m.away}</td>
          <td className="px-2 py-1 whitespace-nowrap text-center">{renderResult(m)}</td>
          <td className="px-2 py-1 break-words">{m.referees.join(", ")}</td>
          <td className="px-2 py-1 break-words">{m.delegate ?? "-"}</td>

          {/* Kary – tylko dla zalogowanych */}
          <td className="px-2 py-1">
            {user?.role === "Guest" ? (
              <span className="text-gray-500">–</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(penaltyMap.get(m.id)?.home || []).map(p => (
                  <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                    {p.name}
                    {(user?.role === 'Admin' || user?.role === 'Delegate') && (
                      <button onClick={() => onRemovePenalty(p.id)} className="ml-1 rounded px-1 leading-none hover:bg-red-100" title="Usuń karę">×</button>
                    )}
                  </span>
                ))}
                {((penaltyMap.get(m.id)?.home || []).length === 0) && <span className="text-gray-500">–</span>}
              </div>
            )}
          </td>

          <td className="px-2 py-1">
            {user?.role === "Guest" ? (
              <span className="text-gray-500">–</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(penaltyMap.get(m.id)?.away || []).map(p => (
                  <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                    {p.name}
                    {(user?.role === 'Admin' || user?.role === 'Delegate') && (
                      <button onClick={() => onRemovePenalty(p.id)} className="ml-1 rounded px-1 leading-none hover:bg-red-100" title="Usuń karę">×</button>
                    )}
                  </span>
                ))}
                {((penaltyMap.get(m.id)?.away || []).length === 0) && <span className="text-gray-500">–</span>}
              </div>
            )}
          </td>

          <td className="px-2 py-1">
            <div className="flex flex-wrap gap-2">
              {m.commsByClub.home && <DocBadge file={m.commsByClub.home} label="Komunikat" disabled={!canDownload} />}
              {m.rosterByClub.home && <DocBadge file={m.rosterByClub.home} label="Skład (Home)" disabled={!canDownload} />}
              {m.rosterByClub.away && <DocBadge file={m.rosterByClub.away} label="Skład (Away)" disabled={!canDownload} />}
              {m.matchReport && <DocBadge file={m.matchReport} label="Protokół" disabled={!canDownload} />}
              {m.reportPhotos.length > 0 && (
                <span className={classes.pill}><Image className="w-3.5 h-3.5" />Zdjęcia: {m.reportPhotos.length}</span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
    </Section>
  );
};



const PerMatchActions: React.FC<{
  state: AppState;
  setState: (s: AppState) => void;
  user: { name: string; role: Role; club?: string };
  onPenaltiesChange: () => void;
}> = ({ state, setState, user, onPenaltiesChange }) => {
  const availableMatches = useMemo(() => {
  if (user.role === "Delegate") {
    return state.matches.filter(m => m.delegate === user.name);
  }
  if (user.role === "Club" && user.club) {
    return state.matches.filter(m => m.home === user.club || m.away === user.club);
  }
  // Admin (lub inne role) widzą wszystko
  return state.matches;
}, [state.matches, user.role, user.name, user.club]);

const [selectedId, setSelectedId] = useState<string>(availableMatches[0]?.id ?? "");
useEffect(() => {
  // gdy zmieni się lista dostępnych meczów, ustaw pierwszy jako domyślny
  setSelectedId(availableMatches[0]?.id ?? "");
}, [availableMatches]);

const match = availableMatches.find(m => m.id === selectedId) || null;

  const [resultDraft, setResultDraft] = useState<string>(match?.result || "");
  const [shootoutDraft, setShootoutDraft] = useState<boolean>(!!match?.shootout);

  useEffect(() => {
    setResultDraft(match?.result || "");
    setShootoutDraft(!!match?.shootout);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function pushLog(next: Match, entry: Omit<UploadLog, "id" | "matchId" | "at">) {
    next.uploadsLog = [
      { id: crypto.randomUUID(), matchId: next.id, at: new Date().toISOString(), ...entry },
      ...next.uploadsLog,
    ];
  }

async function handleUpload(type: "comms" | "roster" | "report" | "photos") {
  if (!match) return;
  const input = document.createElement("input");
  input.type = "file";
  if (type === "photos") input.multiple = true;

  input.onchange = async () => {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const next = { ...match } as Match;

    if (type === "comms" || type === "roster") {
      if (user.role !== "Club" || !user.club) {
        alert("Ta akcja jest dostępna tylko dla roli Klub (z ustawioną nazwą klubu).");
        return;
      }
      const key = user.club === match.home ? "home" : user.club === match.away ? "away" : null;
      if (!key) { alert("Twój klub nie jest przypisany do tego meczu."); return; }

      if (type === "comms") {
        if (!canUploadComms(user, match)) { alert("Komunikat może dodać wyłącznie gospodarz meczu."); return; }
        const sf = await toStoredFileUsingStorage(
          "comms", match.id, match.home, files[0], user.name, `Komunikat - ${match.home} - ${match.date}`
        );
        next.commsByClub[key] = sf;
        pushLog(next, { type: "comms", club: user.club, user: user.name, fileName: sf.name });

        // Metadane zapisze TRIGGER w DB (docs_meta), nie wstawiamy nic z aplikacji.
      } else {
        if (!canUploadRoster(user, match)) { alert("Skład może dodać tylko klub biorący udział w meczu."); return; }
        const clubName = key === "home" ? match.home : match.away;
        const sf = await toStoredFileUsingStorage(
          "roster", match.id, clubName, files[0], user.name, `Skład - ${clubName} - ${match.date}`
        );
        next.rosterByClub[key] = sf;
        pushLog(next, { type: "roster", club: user.club, user: user.name, fileName: sf.name });

        // Metadane zapisze TRIGGER w DB (docs_meta), nie wstawiamy nic z aplikacji.
      }
    }

    if (type === "report") {
      if (!canUploadReport(user)) { alert("Protokół może dodać tylko Delegat."); return; }
      const sf = await toStoredFileUsingStorage(
        "report", match.id, "neutral", files[0], user.name, `Protokół - ${match.home} vs ${match.away} - ${match.date}`
      );
      next.matchReport = sf;
      pushLog(next, { type: "protocol", club: null, user: user.name, fileName: sf.name });

      // Metadane zapisze TRIGGER w DB (docs_meta), nie wstawiamy nic z aplikacji.
    }

    if (type === "photos") {
      if (!canUploadReport(user)) { alert("Zdjęcia raportu może dodać tylko Delegat."); return; }
      const sfs: StoredFile[] = [];
      for (const f of files) {
        sfs.push(await toStoredFileUsingStorage("photos", match.id, "neutral", f, user.name, "Zdjęcie raportu"));
      }
      next.reportPhotos = [...next.reportPhotos, ...sfs];
      pushLog(next, { type: "photos", club: null, user: user.name, fileName: `${files.length} zdjęć` });

      // Metadane zapisze TRIGGER w DB (docs_meta), nie wstawiamy nic z aplikacji.
    }

    // lokalny stan – żeby od razu było widać bez odświeżania
    const newState = { ...state, matches: state.matches.map(m => (m.id === match.id ? next : m)) };
    setState(newState);
  };

  input.click();
}

  async function saveResult() {
    if (!match) return;
    if (!canEditResult(user, match)) { alert("Wynik może ustawić tylko delegat tego meczu."); return; }
    try {
      await setMatchResult(match.id, resultDraft, shootoutDraft);
      const newState = {
        ...state,
        matches: state.matches.map(m =>
          m.id === match.id ? { ...m, result: resultDraft, shootout: shootoutDraft } : m
        ),
      };
      setState(newState);
    } catch (e: any) {
      alert("Błąd zapisu wyniku: " + e.message);
    }
  }

  const canClubAct = () => user.role === "Club" && !!user.club;
  const canDelegateAct = () => user.role === "Delegate";

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-amber-600">Wybierz mecz:</span>
       <select className={classes.input} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
  {availableMatches.length === 0 ? (
    <option value="" disabled>Brak meczów do wyboru</option>
  ) : (
    availableMatches.map(m => (
      <option key={m.id} value={m.id}>
        {m.date} {m.time ? m.time + " • " : ""}{m.home} vs {m.away}
      </option>
    ))
  )}
</select>
      </div>

      {match && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {canClubAct() && (
              <>
                {canUploadComms(user, match) && (
                  <button onClick={() => handleUpload("comms")} className={clsx(classes.btnOutline, "flex items-center gap-2")}>
                    <UploadCloud className="w-4 h-4" />Dodaj komunikat (Gospodarz)
                  </button>
                )}
                {canUploadRoster(user, match) ? (
                  <button onClick={() => handleUpload("roster")} className={clsx(classes.btnOutline, "flex items-center gap-2")}>
                    <UploadCloud className="w-4 h-4" />Dodaj skład (Twój klub)
                  </button>
                ) : (
                  <div className="text-sm text-gray-600">Twój klub nie jest uczestnikiem tego meczu.</div>
                )}
              </>
            )}

{/* Klub–gospodarz: zmiana daty i godziny (tylko jeśli zalogowany klub jest gospodarzem) */}
{user.role === "Club" && user.club && match && user.club === match.home && (
  <div className="mt-4 border-t pt-3">
    <div className="text-sm text-amber-600 font-medium mb-2">
      Zmień datę / godzinę (gospodarz)
    </div>
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
      <div>
        <label className="text-xs text-gray-600">Data</label>
        <input
          type="date"
          defaultValue={match.date}
          id="host-date"
          className={classes.input}
          style={{ minWidth: 180 }}
        />
      </div>
      <div>
        <label className="text-xs text-gray-600">Godzina (opcjonalnie)</label>
        <input
          type="time"
          defaultValue={match.time || ""}
          id="host-time"
          className={classes.input}
          style={{ minWidth: 160 }}
        />
      </div>
      <button
        className={classes.btnPrimary}
        onClick={async () => {
          const dateEl = document.getElementById("host-date") as HTMLInputElement;
          const timeEl = document.getElementById("host-time") as HTMLInputElement;
          const newDate = (dateEl?.value || "").trim();
          const newTime = (timeEl?.value || "").trim();

          if (!newDate) { alert("Podaj poprawną datę."); return; }

          try {
            // zapis w DB (tylko date/time)
            const { error } = await supabase
              .from("matches")
              .update({ date: newDate, time: newTime || null })
              .eq("id", match.id);
            if (error) throw error;

            // odśwież lokalny stan, żeby UI od razu pokazał zmiany
            const updated = { ...match, date: newDate, time: newTime };
            setState({
              ...state,
              matches: state.matches.map(m => (m.id === match.id ? updated : m)),
            });
            alert("Zaktualizowano datę/godzinę.");
          } catch (e:any) {
            alert("Błąd zapisu: " + e.message);
          }
        }}
      >
        Zapisz termin
      </button>
    </div>
    <div className="text-xs text-gray-500 mt-1">
      Uprawnienie tylko dla klubu–gospodarza. Zmienić można wyłącznie datę i godzinę.
    </div>
  </div>
)}

            
            {canDelegateAct() && (
              <>
                <button onClick={() => handleUpload("report")} className={clsx(classes.btnPrimary, "flex items-center gap-2 w-full sm:w-auto")}>
                  <UploadCloud className="w-4 h-4" />Dodaj protokół
                </button>
                <button onClick={() => handleUpload("photos")} className={clsx(classes.btnOutline, "flex items-center gap-2 w-full sm:w-auto")}>
                  <Image className="w-4 h-4" />Dodaj zdjęcia raportu
                </button>
              </>
            )}
          </div>

          {canDelegateAct() && (
            <div className="mt-4 border-t pt-3">
             <div className="text-sm text-amber-600 font-medium mb-2">Nałóż karę</div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <select id="pen-club" className={classes.input + " w-full"} defaultValue="">
                  <option value="" disabled>Wybierz klub</option>
                  <option value={match.home}>{match.home} (gospodarz)</option>
                  <option value={match.away}>{match.away} (goście)</option>
                </select>
                <input id="pen-player" className={classes.input + " w-full"} placeholder="Nazwisko zawodnika" />
  <input id="pen-games" className={classes.input + " w-full"} type="number" min={1} placeholder="Mecze kary" />
              </div>

              <div className="mt-2">
                <button
                  className={clsx(classes.btnPrimary, "flex items-center gap-2")}
                  onClick={async () => {
                    const clubSel = document.getElementById("pen-club") as HTMLSelectElement;
                    const playerInp = document.getElementById("pen-player") as HTMLInputElement;
                    const gamesInp = document.getElementById("pen-games") as HTMLInputElement;

                    const club = clubSel?.value || "";
                    const player = playerInp?.value?.trim() || "";
                    const games = parseInt(gamesInp?.value || "0", 10);

                    if (!club || !player || !games || games < 1) {
                      alert("Wypełnij wszystkie pola: Klub, Nazwisko, Liczba meczów (>=1).");
                      return;
                    }

                    try {
                      await addPenalty(match.id, club, player, games);
                      onPenaltiesChange();
                      alert("Kara dodana.");
                      clubSel.value = "";
                      playerInp.value = "";
                      gamesInp.value = "";
                    } catch (e: any) {
                      alert("Błąd dodawania kary: " + e.message);
                    }
                  }}
                >
                  Dodaj karę
                </button>
                <div className="text-xs text-gray-500 mt-1">
                  Kara będzie widoczna w najbliższych meczach danego klubu, poczynając od następnego spotkania po meczu, w którym ją nałożono.
                </div>
              </div>
            </div>
          )}

          {canEditResult(user, match) && (
          <div className="grid gap-2 grid-cols-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
  <input
    className={classes.input + " w-full sm:w-auto"}
    placeholder="Wynik (np. 10:9)"
    value={resultDraft}
    onChange={(e) => setResultDraft(e.target.value)}
    style={{ maxWidth: 200 }}
  />

  <label className="inline-flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={shootoutDraft}
      onChange={(e) => setShootoutDraft(e.target.checked)}
    />
    Rzuty karne
  </label>

  <button
    onClick={saveResult}
    className={clsx(classes.btnPrimary, "flex items-center gap-2 w-full sm:w-auto")}
  >
    <Check className="w-4 h-4" />
    Zapisz wynik
  </button>

  <span className="text-xs text-gray-500 block">
    (Dostępne tylko dla delegata tego meczu)
  </span>
</div>
          )}
        </div>
      )}
    </div>
  );
};         

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
        <div className="grid grid-cols-2 gap-2"><input className={classes.input} placeholder="Nr meczu" value={draft.round||""} onChange={e=>setDraft({...draft, round:e.target.value})}/><input className={classes.input} placeholder="Miejsce" value={draft.location} onChange={e=>setDraft({...draft, location:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-2">
          <select className={classes.input} value={draft.home} onChange={e=>setDraft({...draft, home:e.target.value})}><option value="">Wybierz gospodarza</option>{clubs.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select className={classes.input} value={draft.away} onChange={e=>setDraft({...draft, away:e.target.value})}><option value="">Wybierz gości</option>{clubs.map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className={classes.input} value={draft.referees[0]} onChange={e=>setDraft({...draft, referees:[e.target.value, draft.referees[1]||""]})}><option value="">Sędzia 1</option>{refereeNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
          <select className={classes.input} value={draft.referees[1]} onChange={e=>setDraft({...draft, referees:[draft.referees[0]||"", e.target.value]})}><option value="">Sędzia 2</option>{refereeNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
        </div>
        <select className={classes.input} value={draft.delegate||""} onChange={e=>setDraft({...draft, delegate:e.target.value})}><option value="">Delegat</option>{delegateNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
        <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result||""} onChange={e=>setDraft({...draft, result:e.target.value})}/>
        <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes||""} onChange={e=>setDraft({...draft, notes:e.target.value})}/>
        <div className="flex gap-2"><button onClick={saveDraft} className={clsx(classes.btnPrimary,"flex items-center gap-2")}><Save className="w-4 h-4"/>{editId?"Zapisz zmiany":"Dodaj mecz"}</button>{editId && (
  <button
    className={classes.btnSecondary}
    onClick={() => {
      setDraft({ ...blank, id: crypto.randomUUID() });
      setEditId(null);
    }}
  >
    Anuluj edycję
  </button>
)}</div>
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

const RankingTable: React.FC<{ matches: Match[]; clubs: string[] }> = ({ matches, clubs }) => {

const table = useMemo(() => {
  type Row = { team: string; pts: number; played: number; goalsFor: number; goalsAgainst: number };
  const stats: Record<string, Row> = {};

  const seeded = (clubs?.length
    ? clubs
    : Array.from(new Set(matches.flatMap(m => [m.home, m.away])))
  );

// 🔧 normalizacja nazw: trim, spacje, NBSP, usunięcie kropek na końcu
  const normalizeTeam = (s: string) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.+$/, ""); // usuń wszystkie kropki na końcu

  const seeded = (clubs?.length
    ? clubs
    : Array.from(new Set(matches.flatMap(m => [m.home, m.away])))
  );

  // zainicjuj znane drużyny
  seeded.forEach((c) => {
    const name = (c || "").trim();
    if (!name) return;
    stats[name] = { team: name, pts: 0, played: 0, goalsFor: 0, goalsAgainst: 0 };
  });

  // helper: doinicjalizuj jeśli drużyna pojawiła się tylko w meczach
  const ensure = (raw: string) => {
    const team = (raw || "").trim();
    if (!team) return null;
    if (!stats[team]) {
      stats[team] = { team, pts: 0, played: 0, goalsFor: 0, goalsAgainst: 0 };
    }
    return team;
  };

  for (const m of matches) {
    if (!m?.result) continue;

    const home = ensure(m.home);
    const away = ensure(m.away);
    if (!home || !away) continue; // pomiń mecze z pustą nazwą

    const [aStr, bStr] = String(m.result).split(":");
    const a = Number(aStr), b = Number(bStr);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    const H = stats[home];
    const A = stats[away];
    if (!H || !A) continue; // ekstra bezpiecznik

    H.played++; A.played++;
    H.goalsFor += a; H.goalsAgainst += b;
    A.goalsFor += b; A.goalsAgainst += a;

    if (m.shootout) {
      if (a > b) { H.pts += 2; A.pts += 1; }
      else       { A.pts += 2; H.pts += 1; }
    } else {
      if (a > b) H.pts += 3;
      else if (b > a) A.pts += 3;
    }
  }

  return Object.values(stats).sort((x, y) => {
    if (x.played === 0 && y.played === 0) return x.team.localeCompare(y.team);
    return (
      y.pts - x.pts ||
      (y.goalsFor - y.goalsAgainst) - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor ||
      x.team.localeCompare(y.team)
    );
  });
}, [matches, clubs]);



return (
  <Section title="Tabela wyników" icon={<Table className="w-5 h-5" />}>
    <table className="table-auto w-full text-xs sm:text-sm">
      <thead className="bg-white shadow-sm">
        <tr className="text-left border-b bg-gray-50">
          <th className="px-2 py-1 whitespace-nowrap w-[80px] text-center">Miejsce</th>
          <th className="px-2 py-1 break-words">Drużyna</th>
          <th className="px-2 py-1 whitespace-nowrap w-[70px] text-center">Pkt</th>
          <th className="px-2 py-1 whitespace-nowrap w-[70px] text-center">M</th>
          <th className="px-2 py-1 whitespace-nowrap w-[90px] text-center">B</th>
        </tr>
      </thead>
      <tbody>
        {table.map((row, i) => (
          <tr
            key={row.team}
            className={clsx(
              "border-b hover:bg-sky-50 transition-colors",
              i % 2 ? "bg-white" : "bg-slate-50/60",
              i === 0 && "!bg-amber-200",
              i === 1 && "!bg-gray-200",
              i === 2 && "!bg-orange-200"
            )}
          >
            <td className="px-2 py-1 whitespace-nowrap text-center">{i + 1}</td>
            <td className="px-2 py-1 break-words">{row.team}</td>
            <td className="px-2 py-1 whitespace-nowrap text-center">{row.pts}</td>
            <td className="px-2 py-1 whitespace-nowrap text-center">{row.played}</td>
            <td className="px-2 py-1 whitespace-nowrap text-center">{row.goalsFor}:{row.goalsAgainst}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Section>
);
};

const UserChip: React.FC<{
  effectiveUser: { name: string; role: Role; club?: string } | null;
  supaUser: any;
  demoLogout: () => void;
}> = ({ effectiveUser, supaUser, demoLogout }) => (
  effectiveUser ? (
    <div className="flex items-center gap-2 shrink-0">
      <Badge tone="blue">
        {effectiveUser.role}
        {effectiveUser.club ? ` • ${effectiveUser.club}` : ""}
      </Badge>
      <span className="text-sm text-gray-700">{effectiveUser.name}</span>
      {!supaUser && (
        <button onClick={demoLogout} className={classes.btnSecondary}>
          <LogOut className="w-4 h-4 inline mr-1" />
          Wyloguj (demo)
        </button>
      )}
    </div>
  ) : (
    <span className="text-sm text-gray-600">Niezalogowany</span>
  )
);

export default function App(){
const { userDisplay, role: sRole } = useSupabaseAuth()
const supaUser = sRole !== 'Guest'
  ? ({ name: userDisplay, role: sRole as Role } as { name: string; role: Role })
  : null
// demo fallback
  const [demoUser, setDemoUser] = useState<{name:string; role:Role; club?:string}|null>(()=>{
    const raw = localStorage.getItem("wpr-auth-user"); return raw? JSON.parse(raw): null
  });
  function demoLogin(n:string,r:Role,c?:string){ const u={name:n, role:r, club:c}; setDemoUser(u); localStorage.setItem("wpr-auth-user", JSON.stringify(u)); }
  function demoLogout(){ setDemoUser(null); localStorage.removeItem("wpr-auth-user"); }



  const [state,setState]=useState<AppState>({ matches: [], users:[
    {name:"Admin", role:"Admin"}, {name:"AZS Szczecin – Klub", role:"Club", club:"AZS Szczecin"}, {name:"KS Warszawa – Klub", role:"Club", club:"KS Warszawa"}, {name:"Anna Delegat", role:"Delegate"}, {name:"Sędzia – Demo", role:"Referee"}, {name:"Gość", role:"Guest"}
  ]});

 // --- Kluby z DB (do list i rankingów) – TERAZ wewnątrz App()
const [clubs, setClubs] = useState<string[]>([]);

const refreshClubs = React.useCallback(async () => {
  const { data, error } = await supabase
    .from("clubs")
    .select("name")
    .order("name", { ascending: true });

  if (!error && data) setClubs(data.map(r => r.name));
}, []);

useEffect(() => {
  refreshClubs();
}, [refreshClubs]);

  
  // Load profiles (for admin select lists)
  const [profiles,setProfiles]=useState<ProfileRow[]>([])
  const [loadingProfiles,setLoadingProfiles]=useState(false)
  async function refreshProfiles() {
  setLoadingProfiles(true);
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      role,
      club_id,
      club:clubs ( name )
    `)
    .order("display_name", { ascending: true });

  if (!error && data) {
    const rows = (data as any[]).map(r => ({
      id: r.id,
      display_name: r.display_name,
      role: r.role as Role,
      club_id: r.club_id,
      club_name: r.club?.name ?? null,
    })) as ProfileRow[];
    setProfiles(rows);
  }
  setLoadingProfiles(false);
}
// Pobierz profiles dla Admina i Klubu (Klub potrzebuje club_id)
useEffect(() => {
  if (sRole === "Admin" || sRole === "Club") {
    refreshProfiles();
  }
}, [sRole]);

// Wyprowadź klub dla zalogowanego (Supabase) z tabeli profiles
const effectiveUser = useMemo(() => {
  if (supaUser) {
    let club: string | undefined = undefined;
    if (supaUser.role === "Club") {
      const profile = profiles.find(p => p.display_name === userDisplay);
      // używamy nazwy klubu pobranej z joinu
      club = (profile?.club_name ?? undefined) as string | undefined;
    }
    return { ...supaUser, club };
  }
  return demoUser;
}, [supaUser, profiles, userDisplay, demoUser]);

  
// --- Penalties state (+load)
const [penalties, setPenalties] = useState<Penalty[]>([]);

async function refreshPenalties() {
  try {
    const rows = await listPenalties();
    setPenalties(rows);
  } catch (e:any) {
    alert("Błąd pobierania kar: " + e.message);
  }
}

// ładujemy kary przy starcie
useEffect(() => { refreshPenalties(); }, []);

  // po zmianie roli/sesji dociągnij kary jeszcze raz (ważne, gdy początkowo był Guest)
useEffect(() => {
  if (effectiveUser && effectiveUser.role !== "Guest") {
    refreshPenalties();
  }
}, [effectiveUser?.role]);

// Wylicz: dla każdego meczu listy kar (z id) dla gospodarzy i gości,
// przy czym kara zaczyna obowiązywać OD NASTĘPNEGO meczu tej drużyny.
function buildPenaltyMap(penalties: Penalty[], matches: Match[]) {
  type Bucket = { home: { id: string; name: string }[]; away: { id: string; name: string }[] };
  const byId = new Map(matches.map(m => [m.id, m]));
  const map = new Map<string, Bucket>();

  // pomocniczo: wszystkie mecze danej drużyny posortowane po dacie
  function clubSchedule(club: string) {
    return matches
      .filter(m => m.home === club || m.away === club)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  penalties.forEach(p => {
    const club = p.club_name;
    const schedule = clubSchedule(club);

    // mecz, po którym kara została nałożona
    const startMatch = byId.get(p.match_id);

    // Indeks tego meczu w terminarzu klubu. Kara obowiązuje OD KOLEJNEGO meczu.
    let startIdx = -1;
    if (startMatch) {
      startIdx = schedule.findIndex(m => m.id === startMatch.id);
    } else {
      // fallback: szukamy pierwszego meczu PO dacie utworzenia
      const created = new Date(p.created_at);
      startIdx = schedule.findIndex(m => new Date(m.date) > created) - 1; // tak, by slice(startIdx+1, ...)
    }

    const nextMatches = schedule.slice(startIdx + 1, startIdx + 1 + p.games);

    nextMatches.forEach(m => {
      const bucket = map.get(m.id) || { home: [], away: [] };
      if (m.home === club) bucket.home.push({ id: p.id, name: p.player_name });
      else bucket.away.push({ id: p.id, name: p.player_name });
      map.set(m.id, bucket);
    });
  });

  return map;
}

  const penaltiesByMatch = useMemo(
  () => buildPenaltyMap(penalties, state.matches),
  [penalties, state.matches]
);
  
// Podział na nadchodzące i zakończone (prosto: po obecności wyniku)
const upcomingMatches = useMemo(
  () => state.matches.filter(m => !m.result || m.result.trim() === ""),
  [state.matches]
);

const finishedMatches = useMemo(
  () => state.matches.filter(m => !!m.result && m.result.trim() !== ""),
  [state.matches]
);

  // Load matches from Supabase and merge docs from localStorage
  const [loadingMatches,setLoadingMatches]=useState(false)
  
    async function refreshMatches() {
  setLoadingMatches(true);
  try {
    const rows = await listMatches();

    // zmapuj wiersze z DB na nasz kształt Match
const matches: Match[] = rows.map((r: any) => ({
  id: r.id,
  date: r.date,
  time: r.time || "",
  round: r.round || "",
  location: r.location,
  home: r.home,
  away: r.away,
  result: r.result || "",
  shootout: !!r.shootout,                 // <— NOWE
  referees: [r.referee1 || "", r.referee2 || ""],
  delegate: r.delegate || "",
  notes: r.notes || "",
  commsByClub: { home: null, away: null },
  rosterByClub: { home: null, away: null },
  matchReport: null,
  reportPhotos: [],
  uploadsLog: [],
}));

    setState((s) => ({ ...s, matches }));

// Dociągnij metadane dokumentów z docs_meta i scal
try {
  // 👇 Jeśli jesteśmy Gościem, nie czytamy docs_meta (RLS i tak nie pozwoli).
  if (sRole === "Guest") {
    setLoadingMatches(false);
    return;
  }

  const matchIds = matches.map((m) => m.id);
  if (matchIds.length > 0) {
    const { data: docs, error: docsErr } = await supabase
      .from("docs_meta")
      .select("match_id, kind, club_or_neutral, path, label")
      .in("match_id", matchIds);

    if (docsErr) throw docsErr;

    const nextMatches = matches.map((m) => {
  const mm = { ...m };
  const d = (docs || []).filter((x) => x.match_id === m.id);

  // ujednolicenie zapisu klubów (tak samo jak w ścieżce w Storage)
  const norm = (s?: string) => (s || "").replace(/\//g, "-").replace(/ /g, "_");

  for (const x of d) {
    if (x.kind === "comms" && x.club_or_neutral === norm(m.home)) {
      mm.commsByClub.home = {
        id: crypto.randomUUID(),
        name: x.label || "Komunikat",
        mime: "application/octet-stream",
        size: 0,
        path: x.path,
        uploadedBy: "",
        uploadedAt: "",
        label: x.label || "Komunikat",
      };
    }

    if (x.kind === "roster") {
      const target =
        x.club_or_neutral === norm(m.home)
          ? "home"
          : x.club_or_neutral === norm(m.away)
          ? "away"
          : null;

      if (target) {
        mm.rosterByClub[target] = {
          id: crypto.randomUUID(),
          name: x.label || `Skład (${target})`,
          mime: "application/octet-stream",
          size: 0,
          path: x.path,
          uploadedBy: "",
          uploadedAt: "",
          label: x.label || `Skład (${target})`,
        };
      }
    }

    if (x.kind === "report") {
      mm.matchReport = {
        id: crypto.randomUUID(),
        name: x.label || "Protokół",
        mime: "application/pdf",
        size: 0,
        path: x.path,
        uploadedBy: "",
        uploadedAt: "",
        label: x.label || "Protokół",
      };
    }

    if (x.kind === "photos") {
      mm.reportPhotos = [
        ...(mm.reportPhotos || []),
        {
          id: crypto.randomUUID(),
          name: x.label || "Zdjęcie raportu",
          mime: "image/*",
          size: 0,
          path: x.path,
          uploadedBy: "",
          uploadedAt: "",
          label: x.label || "Zdjęcie raportu",
        },
      ];
    }
  }

  return mm;
});

    setState((s) => ({ ...s, matches: nextMatches }));
  }
} catch (e: any) {
  alert("Błąd pobierania dokumentów: " + e.message);
}
  } catch (e: any) {
    alert("Błąd pobierania meczów: " + e.message);
  }
  setLoadingMatches(false);
}

useEffect(() => {
  refreshMatches();
}, [sRole]);

  const refereeNames = profiles.filter(p=>p.role==="Referee").map(p=>p.display_name).filter(Boolean)
  const delegateNames = profiles.filter(p=>p.role==="Delegate").map(p=>p.display_name).filter(Boolean)

 async function handleRemovePenalty(id: string) {
  try {
    await deletePenalty(id);
    await refreshPenalties();
  } catch (e: any) {
    alert("Błąd usuwania kary: " + e.message);
  }
}
 return (
<div className="relative min-h-screen p-4 md:p-8 overflow-hidden">
  <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#dff3ff] via-[#6ba8ff] to-[#001f54]" />
  <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-[#5fb3ff]/25 blur-3xl" />
  <div className="pointer-events-none absolute top-1/3 -right-24 w-[520px] h-[520px] rounded-full bg-[#2ea7ff]/20 blur-3xl" />
  <div className="pointer-events-none absolute -bottom-32 left-1/4 w-[560px] h-[560px] rounded-full bg-[#001f54]/30 blur-3xl" />
 <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between rounded-2xl p-3 sm:p-4 border border-white/40 bg-white/50 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-2xl bg-white shadow flex items-center justify-center">
      <Users className="w-5 h-5" />
    </div>
    <div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
        Kolegium Sędziów Piłki Wodnej – Portal
      </h1>
      <p className="text-sm text-gray-600">
        Tabela meczów • Dokumenty klubów • Raporty delegatów
      </p>
    </div>
  </div>

   <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
    
    <div className="w-full sm:w-auto">
      <LoginBox classes={classes} />
    </div>

    
    {effectiveUser && (
      <div className="flex items-center gap-2 shrink-0">
        <Badge tone="blue">
          {effectiveUser.role}
          {effectiveUser.club ? ` • ${effectiveUser.club}` : ""}
        </Badge>
        <span className="text-sm text-gray-700">{effectiveUser.name}</span>
        {!supaUser && (
          <button onClick={demoLogout} className={classes.btnSecondary}>
            <LogOut className="w-4 h-4 inline mr-1" />
            Wyloguj (demo)
          </button>
        )}
      </div>
    )}

    {/* Wersja dla niezalogowanego – osobny blok, bez ternary */}
    {!effectiveUser && (
      <span className="text-sm text-gray-600">Niezalogowany</span>
    )}
  </div>
</header>

    <main className="max-w-6xl mx-auto grid gap-6">
      {!effectiveUser && <LoginPanel users={state.users} onLogin={demoLogin}/>}
 
<RankingTable matches={state.matches} clubs={clubs} />


 {effectiveUser && effectiveUser.role !== "Guest" && (
  <div>
    <PerMatchActions
      state={state}
      setState={setState}
      user={effectiveUser}
      onPenaltiesChange={refreshPenalties}
    />
  </div>
)}

<MatchesTable
  title="Nadchodzące mecze"
variant="upcoming"
  showExport
  state={{ ...state, matches: upcomingMatches }}
  setState={setState}
  user={effectiveUser}
  onRefresh={refreshMatches}
  loading={loadingMatches}
  penaltyMap={penaltiesByMatch}
  onRemovePenalty={handleRemovePenalty}
/>


<MatchesTable
  title="Zakończone mecze"
variant="finished"
  sectionClassName="bg-white/60"
  state={{ ...state, matches: finishedMatches }}
  setState={setState}
  user={effectiveUser}
  onRefresh={refreshMatches}
  loading={loadingMatches}
  penaltyMap={penaltiesByMatch}
  onRemovePenalty={handleRemovePenalty}
/>
     
{effectiveUser?.role === "Admin" && (
  <AdminPanel
    state={state}
    setState={setState}
    clubs={clubs}
    refereeNames={refereeNames}
    delegateNames={delegateNames}
    onAfterChange={() => { refreshMatches(); refreshClubs(); }}
    canWrite={true}
  />
)}

{/* Panel importu użytkowników (Admin) */}
{effectiveUser?.role === "Admin" && (
  <Section title="Import użytkowników (CSV)" icon={<Upload className="w-5 h-5" />}>
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <input id="csv-file" type="file" accept=".csv,text/csv" className={classes.input} />
      <button
        className={classes.btnPrimary}
        onClick={async () => {
          const input = document.getElementById("csv-file") as HTMLInputElement;
          const file = input?.files?.[0];
          if (!file) { alert("Wybierz plik users.csv"); return; }
          try {
            await uploadImportCSV(file);
            const res = await triggerBulkImport();
            alert("Import zakończony.\n" + JSON.stringify(res, null, 2));
          } catch (e:any) {
            alert("Błąd importu: " + (e?.message || String(e)));
          }
        }}
      >
        Wyślij i zaimportuj
      </button>
    </div>
    <div className="text-xs text-gray-600 mt-2">
      Oczekiwane kolumny w <code>users.csv</code>:
      <code> email,name,password,role,club</code>.
    </div>
  </Section>
)}

{effectiveUser?.role === "Admin" && <Diagnostics state={state} />}




    </main>

    <footer className="max-w-6xl mx-auto mt-8 text-xs text-gray-500">
      <p>copyright Lukasz Krol 2025</p>
    </footer>
  </div>)
}



