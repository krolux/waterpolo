/* App with Supabase CRUD for matches (Step 1) + docs kept in localStorage */
import React, { useEffect, useMemo, useState } from "react";
import { Download, Upload, FileText, Users, Shield, Trash2, Edit, LogIn, LogOut, Search, Save, UploadCloud, Image, Settings, Table, Check, RefreshCw, X } from "lucide-react";
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { LoginBox } from './components/LoginBox'
import { supabase } from "./lib/supabase"
import { listMatches, createMatch, updateMatch as dbUpdateMatch, deleteMatch as dbDeleteMatch, setMatchResult } from './lib/matches'
import { addPenalty, listPenalties, deletePenalty, type Penalty } from "./lib/penalties";
import { uploadDoc } from "./lib/storage";
import { uploadImportCSV, triggerBulkImport } from "./lib/imports";
import { setMyAvailability, getMyAvailabilityForMatches, listAvailableReferees } from "./lib/availability";
import { namesOfAvailableReferees } from "./lib/availability";
import { listCompetitions, getCompetitionSeason, listStages, listTournaments, addStage, addTournament, deleteStage, deleteTournament, listTournamentMatches, addTournamentMatch, deleteTournamentMatch, listTournamentClubs, addTournamentClub, deleteTournamentClub, type Competition, type CompetitionSeason, type Stage, type Tournament, type TournamentClub } from "./lib/competitions";
import { NewsStrip } from "./components/NewsStrip";
import { ArticleList } from "./components/ArticleList";
import { ArticleView } from "./components/ArticleView";
import { ArticleEditor } from "./components/ArticleEditor";
import { ArticleModeration } from "./components/ArticleModeration";
import Ktpw from "./components/Ktpw";
import { RegisterForm } from "./components/RegisterForm";
import { AdminUserApprovals } from "./components/AdminUserApprovals";
import { Section } from "./components/shared/Section";
import { Badge } from "./components/shared/Badge";
import { DocBadge } from "./components/shared/DocBadge";
import { RankingTable } from "./components/matches/RankingTable";
import { AdminAvailableReferees } from "./components/matches/AdminAvailableReferees";
import { PerMatchActions } from "./components/matches/PerMatchActions";
import type { Role, StoredFile, UploadLog, Match, AppState, ProfileRow } from "./types/wpolo";



function clsx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }

const normKey = (s?: string) =>
  (s || "")
    .normalize("NFKD")                 
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()                 
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "_") 
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");         


async function removeWholeSlot(
  kind: "comms" | "roster" | "report" | "photos",
  matchId: string,
  clubOrNeutral: string,
  _path?: string // 4. argument opcjonalny – wywołania mogą go podawać; ignorujemy
) {
  // 1) pobierz ścieżki plików z metadanych
  const { data: rows, error: qerr } = await supabase
    .from("docs_meta")
    .select("path")
    .match({ match_id: matchId, kind, club_or_neutral: clubOrNeutral });

  if (qerr) throw qerr;

  const paths = (rows || []).map(r => r.path);

  // 2) usuń pliki ze storage (jeśli są)
  if (paths.length) {
    const { error: serr } = await supabase.storage.from("docs2").remove(paths);
    if (serr) throw serr;
  }

  // 3) usuń metadane
  const { error: derr } = await supabase
    .from("docs_meta")
    .delete()
    .match({ match_id: matchId, kind, club_or_neutral: clubOrNeutral });

  if (derr) throw derr;
}


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

function sanitizeUrl(u?: string | null) {
  const s = (u || "").trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return null;
  } catch {
    // pozwól też na krótkie „youtu.be/…” lub „youtube.com/…” bez protokołu:
    if (/^([a-z0-9-]+\.)+[a-z]{2,}/i.test(s)) return `https://${s}`;
    return null;
  }
}

const prettyRole = (r: Role) => r; // pokazuj prawdziwą rolę
// === MULTI-ROLE HELPERS (NEW) ===
type BaseRole = 'Guest' | 'Admin' | 'Club' | 'Delegate' | 'Referee' | 'Editor';
function isEditor(u:{role:Role})  { return hasRole(u,'Editor') || isAdmin(u); }

// Dopuszczamy łączenie ról separatorami: -, +, przecinek, spacja
function roleTokens(role?: string): BaseRole[] {
  const r = (role || 'Guest').toString().trim();
  if (r === 'Admin') return ['Admin','Club','Delegate','Referee']; // Admin = wszystko
  return r.split(/[-+,\s]+/).map(s => s.trim()).filter(Boolean) as BaseRole[];
}

function hasRole(user: { role?: string | Role } | null | undefined, target: BaseRole) {
  if (!user?.role) return target === 'Guest';
  const toks = roleTokens(String(user.role));
  return toks.includes(target);
}

function isAdmin(u:{role:Role})    { return hasRole(u,'Admin'); }
function isClub(u:{role:Role})     { return hasRole(u,'Club') || isAdmin(u); }
function isDelegate(u:{role:Role}) { return hasRole(u,'Delegate') || isAdmin(u); }
function isReferee(u:{role:Role})  { return hasRole(u,'Referee') || isAdmin(u); }


// Permissions
function canUploadComms(user:{role:Role;club?:string}, m:Match){
  return isClub(user) && !!user.club && user.club===m.home;
}
function canUploadRoster(user:{role:Role;club?:string}, m:Match){
  return isClub(user) && !!user.club && (user.club===m.home || user.club===m.away);
}
function canUploadReport(user:{role:Role;name?:string}, m:Match){
  // Admin zawsze może; w innym przypadku delegatem jest osoba wpisana w tym meczu
  return isAdmin(user) || (!!m.delegate && !!user?.name && m.delegate === user.name);
}
function canEditResult(user:{role:Role;name:string}, m:Match){
  // Admin lub osoba wybrana jako delegat w tym konkretnym meczu
  return isAdmin(user) || (!!m.delegate && m.delegate === user.name);
}



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
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  user: { name: string; role: Role; club?: string } | null;
  onRefresh: () => void;
  loading: boolean;
  penaltyMap: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
  onRemovePenalty: (id: string) => void;
  title?: string;
  sectionClassName?: string;
  variant: "upcoming" | "finished";
  showExport?: boolean;
  onQuickEdit?: (matchId: string) => void;
  clubs: readonly string[];
  refereeNames: string[];
  delegateNames: string[];
  editingMatchId?: string | null;
  onCancelEdit?: () => void;
}> = ({
  state,
  setState,
  user,
  onRefresh,
  loading,
  penaltyMap,
  onRemovePenalty,
  title,
  sectionClassName,
  variant,
  showExport = false,
  onQuickEdit,
  clubs,
  refereeNames,
  delegateNames,
  editingMatchId,
  onCancelEdit,
}) => {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "seriesRound">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openActionsMatchId, setOpenActionsMatchId] = useState<string | null>(null);
  const activeEditorRef = React.useRef<HTMLDivElement>(null);
  const cardBg = variant === "upcoming" ? "bg-white" : "bg-white/90";
  const rowStriping = "";

  const sorted = useMemo(() => {
  const arr = [...state.matches];

  const parseRound = (r?: string) => {
    const n = parseInt(String(r ?? "").trim(), 10);
    return Number.isFinite(n) ? n : 0;
  };

arr.sort((a, b) => {
  const as = (a.seriesRound ?? "").toString().trim();
  const bs = (b.seriesRound ?? "").toString().trim();

  const parseNum = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  if (sortKey === "seriesRound") {
    const na = parseNum(as);
    const nb = parseNum(bs);

    if (na !== null && nb !== null && na !== nb) {
      return sortDir === "asc" ? na - nb : nb - na;
    }
    if (as !== bs) {
      return sortDir === "asc" ? as.localeCompare(bs, "pl") : bs.localeCompare(as, "pl");
    }
    // tie-breaker: po numerze meczu (round = nr meczu) rosnąco
    const ma = parseNum(String(a.round ?? ""));
    const mb = parseNum(String(b.round ?? ""));
    if (ma !== null && mb !== null && ma !== mb) return ma - mb;

    // ostatecznie po dacie
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  }

  // sort wg daty
  const da = new Date(a.date).getTime();
  const db = new Date(b.date).getTime();
  if (da !== db) return sortDir === "asc" ? da - db : db - da;

  // tie-breaker: po numerze meczu rosnąco
  const ma = parseNum(String(a.round ?? ""));
  const mb = parseNum(String(b.round ?? ""));
  return (ma ?? 0) - (mb ?? 0);
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

  // --- [GRUPOWANIE WG RUNDY] ---
const groupedByRound = useMemo(() => {
  const groups: Record<string, Match[]> = {};

  for (const m of filtered) {
const key = (m.seriesRound ?? "").toString().trim() || "—";
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  // Rundy numericzne najpierw rosnąco, nienumeryczne po nazwie
  const sortedRounds = Object.keys(groups).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) return na - nb;
    if (aNum !== bNum) return aNum ? -1 : 1;
    return a.localeCompare(b, "pl");
  });

  return { groups, sortedRounds };
}, [filtered]);



const formatDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit" })
    .replace(/\./g, "-");
  
const isGuest = !user || hasRole(user, 'Guest');
const canDownload = !!user && !isGuest;
const isUserReferee = !!user && user.role === "Referee";
const isUserAdmin = !!user && isAdmin(user);

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
  onChange={(e) => setSortKey(e.target.value as "date" | "seriesRound")}
  className={classes.input}
  style={{ maxWidth: 170 }}
  title="Sortuj wg…"
>
  <option value="date">Sortuj wg daty</option>
  <option value="seriesRound">Sortuj wg rundy</option>
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

{/* MOBILE: grupy wg Rundy (karty) */}
<div className="md:hidden space-y-4">
  {groupedByRound.sortedRounds.map((runda) => (
    <div key={runda} className="rounded-xl border-2 border-amber-400 overflow-hidden bg-white">
      <div className="bg-amber-50 text-amber-800 font-semibold text-center py-1">
        Runda {runda}
      </div>

      <div className="p-3 space-y-3">
        {groupedByRound.groups[runda].map((m) => {
          const homePens = penaltyMap.get(m.id)?.home || [];
          const awayPens = penaltyMap.get(m.id)?.away || [];
          const streamHref = sanitizeUrl(m.streamUrl);
          const isEditingThisMatch = editingMatchId === m.id;

          return (
            <div
              key={m.id}
              className={clsx(
                "rounded-xl border p-3 shadow-sm transition-colors",
                cardBg,
                isEditingThisMatch && "border-amber-400 bg-amber-50/80"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 truncate">
                    {formatDate(m.date)}{m.time ? ` ${m.time}` : ""} • {m.location}
                  </div>
                  <div className="font-medium break-words">{m.home} vs {m.away}</div>

                  <div className="text-xs text-gray-600 break-words">
                    Sędziowie: {m.referees.filter(Boolean).join(", ") || "–"}
                    {m.delegate ? ` • Delegat: ${m.delegate}` : ""}
                    {user && isAdmin(user) && onQuickEdit && (
                      <button
                        className="ml-2 underline text-blue-700"
                        onClick={() => onQuickEdit(m.id)}
                        title="Szybka edycja w panelu admina"
                      >
                        Edytuj
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-right text-sm font-semibold shrink-0">
                  {renderResult(m)}
                </div>
              </div>

              {/* Kary – tylko dla zalogowanych */}
              {user && isAdmin(user) && isEditingThisMatch && (
                <div ref={activeEditorRef} className="mt-3">
                  <AdminPanel
                    state={state}
                    setState={setState}
                    clubs={clubs}
                    refereeNames={refereeNames}
                    delegateNames={delegateNames}
                    onAfterChange={() => {
                      onRefresh();
                      onCancelEdit?.();
                    }}
                    canWrite={true}
                    editingMatchId={m.id}
                    clearEditing={onCancelEdit}
                    compact
                  />
                </div>
              )}

              <div className="mt-2 grid grid-cols-1 gap-2">
                <div className="text-xs">
                  <span className="font-semibold">Kary (Gospodarz): </span>
                  {isGuest ? (
                    <span className="text-gray-500">–</span>
                  ) : homePens.length === 0 ? (
                    <span className="text-gray-500">–</span>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1 align-top">
                      {homePens.map(p => (
                        <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                          {p.name}
                          {(user && (isAdmin(user) || isDelegate(user))) && (
                            <button
                              onClick={() => onRemovePenalty(p.id)}
                              className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                              title="Usuń karę"
                            >×</button>
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </div>

                <div className="text-xs">
                  <span className="font-semibold">Kary (Goście): </span>
                  {isGuest ? (
                    <span className="text-gray-500">–</span>
                  ) : awayPens.length === 0 ? (
                    <span className="text-gray-500">–</span>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1 align-top">
                      {awayPens.map(p => (
                        <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                          {p.name}
                          {(user && (isAdmin(user) || m.delegate === user.name)) && (
                            <button
                              onClick={() => onRemovePenalty(p.id)}
                              className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                              title="Usuń karę"
                            >×</button>
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </div>

                {isUserReferee && variant === "upcoming" && (
                  <div className="text-xs">
                    <span className="font-semibold mr-1">Dostępność:</span>
                    <span className="inline-flex items-center gap-2">
                      {/* DOSTĘPNY */}
                      <button
                        className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded border",
                          m.myAvailabilitySet
                            ? (m.myAvailable
                                ? "bg-green-50 border-green-300 text-green-700"
                                : "bg-gray-100 border-gray-300 text-gray-500")
                            : "bg-green-50 border-green-300 text-green-700"
                        )}
                        onClick={async () => {
                          try {
                            await setMyAvailability(m.id, true);
                            setState(s => ({
                              ...s,
                              matches: s.matches.map(x =>
                                x.id === m.id ? { ...x, myAvailable: true, myAvailabilitySet: true } : x
                              )
                            }));
                          } catch (e:any) {
                            alert("Błąd zapisu dostępności: " + e.message);
                          }
                        }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Check className={clsx("w-4 h-4",
                            m.myAvailabilitySet ? (m.myAvailable ? "text-green-700" : "text-gray-400") : "text-green-700"
                          )}/>
                          Dostępny
                        </span>
                      </button>

                      {/* NIEDOSTĘPNY */}
                      <button
                        className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded border",
                          m.myAvailabilitySet
                            ? (!m.myAvailable
                                ? "bg-red-50 border-red-300 text-red-700"
                                : "bg-gray-100 border-gray-300 text-gray-500")
                            : "bg-red-50 border-red-300 text-red-700"
                        )}
                        onClick={async () => {
                          try {
                            await setMyAvailability(m.id, false);
                            setState(s => ({
                              ...s,
                              matches: s.matches.map(x =>
                                x.id === m.id ? { ...x, myAvailable: false, myAvailabilitySet: true } : x
                              )
                            }));
                          } catch (e:any) {
                            alert("Błąd zapisu dostępności: " + e.message);
                          }
                        }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <X className={clsx("w-4 h-4",
                            m.myAvailabilitySet ? (!m.myAvailable ? "text-red-700" : "text-gray-400") : "text-red-700"
                          )}/>
                          Niedostępny
                        </span>
                      </button>
                    </span>
                  </div>
                )}
              </div>

              {/* Dokumenty + transmisja */}
              <div className="mt-2 flex flex-wrap gap-2">
                {m.commsByClub.home && (
                  <DocBadge
                    file={m.commsByClub.home}
                    label="Komunikat"
                    disabled={!canDownload}
                    canRemove={!!user && isAdmin(user)}
                    onRemove={async () => {
                      try {
                        await removeWholeSlot("comms", m.id, normKey(m.home), m.commsByClub.home!.path);
                        setState({
                          ...state,
                          matches: state.matches.map(x =>
                            x.id === m.id ? { ...x, commsByClub: { ...x.commsByClub, home: null } } : x
                          ),
                        });
                      } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                    }}
                  />
                )}

                {m.rosterByClub.home && (
                  <DocBadge
                    file={m.rosterByClub.home}
                    label="Skład (Home)"
                    disabled={!canDownload}
                    canRemove={!!user && isAdmin(user)}
                    onRemove={async () => {
                      try {
                        await removeWholeSlot("roster", m.id, normKey(m.home), m.rosterByClub.home!.path);
                        setState({
                          ...state,
                          matches: state.matches.map(x =>
                            x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, home: null } } : x
                          ),
                        });
                      } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                    }}
                  />
                )}

                {m.rosterByClub.away && (
                  <DocBadge
                    file={m.rosterByClub.away}
                    label="Skład (Away)"
                    disabled={!canDownload}
                    canRemove={!!user && isAdmin(user)}
                    onRemove={async () => {
                      try {
                        await removeWholeSlot("roster", m.id, normKey(m.away), m.rosterByClub.away!.path);
                        setState({
                          ...state,
                          matches: state.matches.map(x =>
                            x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, away: null } } : x
                          ),
                        });
                      } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                    }}
                  />
                )}

                {m.matchReport && (
                  <DocBadge
                    file={m.matchReport}
                    label="Protokół"
                    disabled={!canDownload}
                    canRemove={!!user && isAdmin(user)}
                    onRemove={async () => {
                      try {
                        await removeWholeSlot("report", m.id, "neutral", m.matchReport!.path);
                        setState({
                          ...state,
                          matches: state.matches.map(x =>
                            x.id === m.id ? { ...x, matchReport: null } : x
                          ),
                        });
                      } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                    }}
                  />
                )}

                {m.reportPhotos.length > 0 && (
                  <span className={classes.pill}>
                    <Image className="w-3.5 h-3.5" />
                    Zdjęcia: {m.reportPhotos.length}
                  </span>
                )}

                {streamHref && (
                  <a
                    href={streamHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={clsx(classes.pill, "hover:shadow")}
                    title="Otwórz transmisję w nowej karcie"
                  >
                    ▶︎ Transmisja
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpenActionsMatchId(current => current === m.id ? null : m.id)}
                className={clsx(classes.btnSecondary, "text-xs px-2 py-1")}
              >
                {openActionsMatchId === m.id ? "Ukryj akcje" : "Akcje"}
              </button>

              {openActionsMatchId === m.id && (
                <div className="mt-2">
                  <PerMatchActions
                    state={state}
                    setState={setState}
                    user={user}
                    onPenaltiesChange={onRefresh}
                    fixedMatch={m}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ))}
</div>


{/* DESKTOP: tabela bez scrolla, węższe kolumny + zawijanie */}
<div className="hidden md:block">
  <table className="table-auto w-full text-xs sm:text-sm">
    <thead className="bg-white">
      <tr className="text-left border-b">
        <th className="px-2 py-1 whitespace-nowrap w-[90px] text-center">Data</th>
<th className="px-2 py-1 whitespace-nowrap w-[80px] text-center">Nr meczu</th>

        <th className="px-2 py-1 break-words w-[120px]">Miejsce</th>
        <th className="px-2 py-1 break-words w-[150px]">Gospodarz</th>
        <th className="px-2 py-1 break-words w-[150px]">Goście</th>
        <th className="px-2 py-1 whitespace-nowrap w-[72px] text-center">Wynik</th>
        <th className="px-2 py-1 break-words w-[160px]">Sędziowie</th>
        <th className="px-2 py-1 break-words w-[120px]">Delegat</th>
        <th className="px-2 py-1 break-words w-[140px]">Kary (Gospodarz)</th>
        <th className="px-2 py-1 break-words w-[140px]">Kary (Goście)</th>
        <th className="px-2 py-1 break-words w-[140px]">Dokumenty</th>
        {variant === "upcoming" && isUserReferee && (
  <th className="px-2 py-1 whitespace-nowrap w-[110px] text-center">Dostępność</th>
)}
{isUserAdmin && (
  <th className="px-2 py-1 break-words w-[220px]">Sędziowie dostępni</th>
)}

      </tr>
    </thead>

<tbody>
  {groupedByRound.sortedRounds.map((runda) => {
    const group = groupedByRound.groups[runda];
    return (
      <React.Fragment key={runda}>
        {/* NAGŁÓWEK RUNDY */}
        <tr>
<td
  colSpan={
    11 +
    (variant === "upcoming" && isUserReferee ? 1 : 0) +
    (isUserAdmin ? 1 : 0)
  }
  className="bg-amber-50 border-y-2 border-amber-400 text-center font-semibold text-amber-800 py-2"
>
  Runda {runda}
</td>
        </tr>

        {/* MECZE DANEJ RUNDY */}
        {group.map((m, i) => {
          const isLast = i === group.length - 1;
          const sideBorders = "border-l-2 border-r-2 border-amber-400";
          const bottomBorder = isLast ? "border-b-2 border-amber-400" : "";
          const streamHref = sanitizeUrl(m.streamUrl);
          const isEditingThisMatch = editingMatchId === m.id;

          return (
            <React.Fragment key={m.id}>
            <tr
              className={clsx(
                "hover:bg-sky-50 transition-colors align-top",
                rowStriping,
                sideBorders,
                isEditingThisMatch ? "bg-amber-50/80" : "",
                isEditingThisMatch ? "" : bottomBorder
              )}
            >
              <td className="px-2 py-1 whitespace-nowrap text-center">
                {formatDate(m.date)}{m.time ? ` ${m.time}` : ""}
              </td>
              <td className="px-2 py-1 whitespace-nowrap text-center">{m.round ?? "-"}</td>
              <td className="px-2 py-1 break-words">{m.location}</td>
              <td className="px-2 py-1 break-words">{m.home}</td>
              <td className="px-2 py-1 break-words">{m.away}</td>
              <td className="px-2 py-1 whitespace-nowrap text-center">{renderResult(m)}</td>

              <td className="px-2 py-1 break-words">
                {m.referees.join(", ")}
                {user && isAdmin(user) && onQuickEdit && (
                  <button
                    className="ml-2 underline text-blue-700"
                    onClick={() => onQuickEdit(m.id)}
                    title="Szybka edycja w panelu admina"
                  >
                    Edytuj
                  </button>
                )}
              </td>

              <td className="px-2 py-1 break-words">{m.delegate ?? "-"}</td>

              {/* Kary (Gospodarz) */}
              <td className="px-2 py-1">
                {isGuest ? (
                  <span className="text-gray-500">–</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(penaltyMap.get(m.id)?.home || []).map(p => (
                      <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                        {p.name}
                        {(user && (isAdmin(user) || isDelegate(user))) && (
                          <button
                            onClick={() => onRemovePenalty(p.id)}
                            className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                            title="Usuń karę"
                          >×</button>
                        )}
                      </span>
                    ))}
                    {((penaltyMap.get(m.id)?.home || []).length === 0) && <span className="text-gray-500">–</span>}
                  </div>
                )}
              </td>

              {/* Kary (Goście) */}
              <td className="px-2 py-1">
                {isGuest ? (
                  <span className="text-gray-500">–</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(penaltyMap.get(m.id)?.away || []).map(p => (
                      <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                        {p.name}
                        {(user && (isAdmin(user) || m.delegate === user.name)) && (
                          <button
                            onClick={() => onRemovePenalty(p.id)}
                            className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                            title="Usuń karę"
                          >×</button>
                        )}
                      </span>
                    ))}
                    {((penaltyMap.get(m.id)?.away || []).length === 0) && <span className="text-gray-500">–</span>}
                  </div>
                )}
              </td>

              {/* Dokumenty + transmisja */}
              <td className="px-2 py-1">
                <div className="flex flex-wrap gap-2">
                  {m.commsByClub.home && (
                    <DocBadge
                      file={m.commsByClub.home}
                      label="Komunikat"
                      disabled={!canDownload}
                      canRemove={!!user && isAdmin(user)}
                      onRemove={async () => {
                        try {
                          await removeWholeSlot("comms", m.id, normKey(m.home), m.commsByClub.home!.path);
                          setState({
                            ...state,
                            matches: state.matches.map(x =>
                              x.id === m.id ? { ...x, commsByClub: { ...x.commsByClub, home: null } } : x
                            ),
                          });
                        } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                      }}
                    />
                  )}

                  {m.rosterByClub.home && (
                    <DocBadge
                      file={m.rosterByClub.home}
                      label="Skład (Home)"
                      disabled={!canDownload}
                      canRemove={!!user && isAdmin(user)}
                      onRemove={async () => {
                        try {
                          await removeWholeSlot("roster", m.id, normKey(m.home), m.rosterByClub.home!.path);
                          setState({
                            ...state,
                            matches: state.matches.map(x =>
                              x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, home: null } } : x
                            ),
                          });
                        } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                      }}
                    />
                  )}

                  {m.rosterByClub.away && (
                    <DocBadge
                      file={m.rosterByClub.away}
                      label="Skład (Away)"
                      disabled={!canDownload}
                      canRemove={!!user && isAdmin(user)}
                      onRemove={async () => {
                        try {
                          await removeWholeSlot("roster", m.id, normKey(m.away), m.rosterByClub.away!.path);
                          setState({
                            ...state,
                            matches: state.matches.map(x =>
                              x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, away: null } } : x
                            ),
                          });
                        } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                      }}
                    />
                  )}

                  {m.matchReport && (
                    <DocBadge
                      file={m.matchReport}
                      label="Protokół"
                      disabled={!canDownload}
                      canRemove={!!user && isAdmin(user)}
                      onRemove={async () => {
                        try {
                          await removeWholeSlot("report", m.id, "neutral", m.matchReport!.path);
                          setState({
                            ...state,
                            matches: state.matches.map(x =>
                              x.id === m.id ? { ...x, matchReport: null } : x
                            ),
                          });
                        } catch (e:any) { alert("Błąd usuwania: " + e.message); }
                      }}
                    />
                  )}

                  {m.reportPhotos.length > 0 && (
                    <span className={classes.pill}>
                      <Image className="w-3.5 h-3.5" />
                      Zdjęcia: {m.reportPhotos.length}
                    </span>
                  )}

                  {streamHref && (
                    <a
                      href={streamHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(classes.pill, "hover:shadow")}
                      title="Otwórz transmisję w nowej karcie"
                    >
                      ▶︎ Transmisja
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpenActionsMatchId(current => current === m.id ? null : m.id)}
                    className={clsx(classes.btnSecondary, "text-xs px-2 py-1")}
                  >
                    {openActionsMatchId === m.id ? "Ukryj akcje" : "Akcje"}
                  </button>
                </div>
              </td>

              {/* Dostępność (dla sędziego) */}
              {variant === "upcoming" && isUserReferee && (
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2 justify-center">
                    {/* DOSTĘPNY */}
                    <button
                      className={clsx(
                        "px-2 py-1 rounded border text-sm min-w-[36px]",
                        m.myAvailabilitySet
                          ? (m.myAvailable
                              ? "bg-green-50 border-green-300 text-green-700"
                              : "bg-gray-100 border-gray-300 text-gray-500")
                          : "bg-green-50 border-green-300 text-green-700"
                      )}
                      title="Jestem dostępny"
                      onClick={async () => {
                        try {
                          await setMyAvailability(m.id, true);
                          setState(s => ({
                            ...s,
                            matches: s.matches.map(x =>
                              x.id === m.id ? { ...x, myAvailable: true, myAvailabilitySet: true } : x
                            )
                          }));
                        } catch (e:any) {
                          alert("Błąd zapisu dostępności: " + e.message);
                        }
                      }}
                    >
                      <Check
                        className={clsx(
                          "w-4 h-4",
                          m.myAvailabilitySet
                            ? (m.myAvailable ? "text-green-700" : "text-gray-400")
                            : "text-green-700"
                        )}
                      />
                    </button>

                    {/* NIEDOSTĘPNY */}
                    <button
                      className={clsx(
                        "px-2 py-1 rounded border text-sm min-w-[36px]",
                        m.myAvailabilitySet
                          ? (!m.myAvailable
                              ? "bg-red-50 border-red-300 text-red-700"
                              : "bg-gray-100 border-gray-300 text-gray-500")
                          : "bg-red-50 border-red-300 text-red-700"
                      )}
                      title="Nie mogę"
                      onClick={async () => {
                        try {
                          await setMyAvailability(m.id, false);
                          setState(s => ({
                            ...s,
                            matches: s.matches.map(x =>
                              x.id === m.id ? { ...x, myAvailable: false, myAvailabilitySet: true } : x
                            )
                          }));
                        } catch (e:any) {
                          alert("Błąd zapisu dostępności:" + e.message);
                        }
                      }}
                    >
                      <X
                        className={clsx(
                          "w-4 h-4",
                          m.myAvailabilitySet
                            ? (!m.myAvailable ? "text-red-700" : "text-gray-400")
                            : "text-red-700"
                        )}
                      />
                    </button>
                  </div>
                </td>
              )}

              {/* Sędziowie dostępni (Admin) */}
              {isUserAdmin && (
                <td className="px-2 py-1 break-words">
                  <AdminAvailableReferees matchId={m.id} />
                </td>
              )}
            </tr>

            {openActionsMatchId === m.id && (
              <tr className={clsx(sideBorders, bottomBorder)}>
                <td
                  colSpan={
                    11 +
                    (variant === "upcoming" && isUserReferee ? 1 : 0) +
                    (isUserAdmin ? 1 : 0)
                  }
                  className="px-2 py-2 bg-slate-50"
                >
                  <PerMatchActions
                    state={state}
                    setState={setState}
                    user={user}
                    onPenaltiesChange={onRefresh}
                    fixedMatch={m}
                  />
                </td>
              </tr>
            )}

            {user && isAdmin(user) && isEditingThisMatch && (
              <tr className={clsx(sideBorders, bottomBorder)}>
                <td
                  colSpan={
                    11 +
                    (variant === "upcoming" && isUserReferee ? 1 : 0) +
                    (isUserAdmin ? 1 : 0)
                  }
                  className="px-2 py-2 bg-slate-50"
                >
                  <div ref={activeEditorRef}>
                    <AdminPanel
                      state={state}
                      setState={setState}
                      clubs={clubs}
                      refereeNames={refereeNames}
                      delegateNames={delegateNames}
                      onAfterChange={() => {
                        onRefresh();
                        onCancelEdit?.();
                      }}
                      canWrite={true}
                      editingMatchId={m.id}
                      clearEditing={onCancelEdit}
                      compact
                    />
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  })}
</tbody>

  </table>
</div>
    </Section>
  );
};

const AdminPanel: React.FC<{
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  clubs: readonly string[];
  refereeNames: string[];
  delegateNames: string[];
  onAfterChange: () => void;
  canWrite: boolean;
  editingMatchId?: string | null;
  clearEditing?: () => void;
  compact?: boolean;
}> = ({
  state, setState, clubs, refereeNames, delegateNames, onAfterChange, canWrite,
  editingMatchId, clearEditing, compact = false
}) => {


const blank: Match = {
  id: crypto.randomUUID(),
  date: new Date().toISOString().slice(0,10),
  time: "",
  round: "",
  seriesRound: null,
  location: "",
  home: "",
  away: "",
  referees: ["",""],
  delegate: "",
  commsByClub: { home: null, away: null },
  rosterByClub: { home: null, away: null },
  matchReport: null,
  reportPhotos: [],
  notes: "",
  result: "",
  uploadsLog: [],
  streamUrl: null, // <-- DODANE
};
  const [draft,setDraft]=useState<Match>(blank); const [editId,setEditId]=useState<string|null>(null);
  // ✓ przy sędziach dostępnych na aktualnie edytowany mecz (draft.id)
const [availNames, setAvailNames] = React.useState<Set<string>>(new Set());

React.useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      if (!draft?.id) {
        if (!cancelled) setAvailNames(new Set());
        return;
      }

      // Ręcznie określany typ, żeby TS nie robił z tego { name: any }[]
      const result: unknown = await namesOfAvailableReferees(draft.id);

      let safe = new Set<string>();

      if (result instanceof Set) {
        safe = new Set<string>(Array.from(result as Set<unknown>)
          .map(String)
          .filter(Boolean));
      } else if (Array.isArray(result)) {
        // Obsługuje: string[] | { name:string }[] | { display_name:string }[]
        const arr = (result as any[])
          .map((r) => {
            if (typeof r === "string") return r;
            if (r && typeof r === "object") {
              if (typeof (r as any).name === "string") return (r as any).name;
              if (typeof (r as any).display_name === "string") return (r as any).display_name;
            }
            return "";
          })
          .filter((x) => typeof x === "string" && x.length > 0);
        safe = new Set<string>(arr);
      }

      if (!cancelled) setAvailNames(safe);
    } catch (e: any) {
      console.warn("namesOfAvailableReferees error:", e?.message || e);
      if (!cancelled) setAvailNames(new Set());
    }
  })();
  return () => {
    cancelled = true;
  };
}, [draft?.id]);

// ⤵️ Quick-edit z tabeli: po otrzymaniu id meczu ustawiamy formularz i tryb edycji
useEffect(() => {
  if (!editingMatchId) return;
  const m = state.matches.find(x => x.id === editingMatchId);
  if (m) {
    setDraft(m);
    setEditId(m.id);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [editingMatchId, state.matches]);

  
function toDbRow(m: Match){
  return {
    date: m.date,
    time: m.time || null,
    round: m.round || null,
        series_round: m.seriesRound || null,
    location: m.location,
    home: m.home,
    away: m.away,
    result: m.result || null,
    referee1: m.referees[0] || null,
    referee2: m.referees[1] || null,
    delegate: m.delegate || null,
    notes: m.notes || null,
    stream_url: sanitizeUrl(m.streamUrl) || null, 
  };
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
      setDraft({ ...blank, id: crypto.randomUUID() });
      setEditId(null);
      clearEditing?.();
      onAfterChange();
    } catch(e:any){ alert("Błąd zapisu: " + e.message) }
  }

  async function removeMatch(id:string){
    if(!canWrite){ alert("Tylko Admin może usuwać mecze."); return; }
    if(!confirm("Usunąć mecz?")) return;
    try{ await dbDeleteMatch(id); onAfterChange(); } catch(e:any){ alert("Błąd usuwania: " + e.message) }
  }

  if (compact) {
    return (
      <div className="rounded-xl border border-sky-200 bg-slate-50/80 p-3">
        <div className="mb-2 text-sm font-semibold text-slate-700">Edytuj mecz</div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2"><input className={classes.input} type="date" value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})}/><input className={classes.input} placeholder="Godzina (opcjonalnie)" value={draft.time||""} onChange={e=>setDraft({...draft, time:e.target.value})}/></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className={classes.input} placeholder="Nr meczu" value={draft.round || ""} onChange={e => setDraft({ ...draft, round: e.target.value })} />
            <input className={classes.input} placeholder="Runda" value={draft.seriesRound || ""} onChange={e => setDraft({ ...draft, seriesRound: e.target.value })} />
            <input className={classes.input} placeholder="Miejsce" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={classes.input} value={draft.home} onChange={e=>setDraft({...draft, home:e.target.value})}><option value="">Wybierz gospodarza</option>{clubs.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <select className={classes.input} value={draft.away} onChange={e=>setDraft({...draft, away:e.target.value})}><option value="">Wybierz gości</option>{clubs.map(c=><option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={classes.input} value={draft.referees[0]} onChange={e=>setDraft({...draft, referees:[e.target.value, draft.referees[1]||""]})}>
              <option value="">Sędzia 1</option>
              {refereeNames.map(n => (
                <option key={n} value={n}>{n}{availNames.has(n) ? " ✓" : ""}</option>
              ))}
            </select>
            <select className={classes.input} value={draft.referees[1]} onChange={e=>setDraft({...draft, referees:[draft.referees[0]||"", e.target.value]})}>
              <option value="">Sędzia 2</option>
              {refereeNames.map(n => (
                <option key={n} value={n}>{n}{availNames.has(n) ? " ✓" : ""}</option>
              ))}
            </select>
          </div>
          <select className={classes.input} value={draft.delegate||""} onChange={e=>setDraft({...draft, delegate:e.target.value})}><option value="">Delegat</option>{delegateNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
          <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result||""} onChange={e=>setDraft({...draft, result:e.target.value})}/>
          <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes||""} onChange={e=>setDraft({...draft, notes:e.target.value})}/>
          <input className={classes.input} placeholder="Link do transmisji (opcjonalny)" value={draft.streamUrl || ""} onChange={e => setDraft({ ...draft, streamUrl: e.target.value })} />
          <div className="flex gap-2"><button onClick={saveDraft} className={clsx(classes.btnPrimary,"flex items-center gap-2")}><Save className="w-4 h-4"/>{editId?"Zapisz zmiany":"Dodaj mecz"}</button>{editId && (
            <button className={classes.btnSecondary} onClick={() => { setDraft({ ...blank, id: crypto.randomUUID() }); setEditId(null); clearEditing?.(); }} >Anuluj edycję</button>
          )}</div>
          {!canWrite && <div className="text-xs text-amber-700">Zaloguj się jako Admin, aby dodać/edytować mecze.</div>}
        </div>
      </div>
    );
  }

  return (<Section title="Panel administratora (mecze w bazie)" icon={<Settings className="w-5 h-5" />}> 
    <div className="grid md:grid-cols-2 gap-6">
      <div><div className="font-medium mb-2">Dodaj / edytuj mecz</div><div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2"><input className={classes.input} type="date" value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})}/><input className={classes.input} placeholder="Godzina (opcjonalnie)" value={draft.time||""} onChange={e=>setDraft({...draft, time:e.target.value})}/></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
  <input
    className={classes.input}
    placeholder="Nr meczu"
    value={draft.round || ""}
    onChange={e => setDraft({ ...draft, round: e.target.value })}
  />
  <input
    className={classes.input}
    placeholder="Runda"
    value={draft.seriesRound || ""}
    onChange={e => setDraft({ ...draft, seriesRound: e.target.value })}
  />
  <input
    className={classes.input}
    placeholder="Miejsce"
    value={draft.location}
    onChange={e => setDraft({ ...draft, location: e.target.value })}
  />
</div>
        <div className="grid grid-cols-2 gap-2">
          <select className={classes.input} value={draft.home} onChange={e=>setDraft({...draft, home:e.target.value})}><option value="">Wybierz gospodarza</option>{clubs.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select className={classes.input} value={draft.away} onChange={e=>setDraft({...draft, away:e.target.value})}><option value="">Wybierz gości</option>{clubs.map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
<div className="grid grid-cols-2 gap-2">
  <select
    className={classes.input}
    value={draft.referees[0]}
    onChange={e=>setDraft({...draft, referees:[e.target.value, draft.referees[1]||""]})}
  >
    <option value="">Sędzia 1</option>
    {refereeNames.map(n => (
      <option key={n} value={n}>
        {n}{availNames.has(n) ? " ✓" : ""}
      </option>
    ))}
  </select>

  <select
    className={classes.input}
    value={draft.referees[1]}
    onChange={e=>setDraft({...draft, referees:[draft.referees[0]||"", e.target.value]})}
  >
    <option value="">Sędzia 2</option>
    {refereeNames.map(n => (
      <option key={n} value={n}>
        {n}{availNames.has(n) ? " ✓" : ""}
      </option>
    ))}
  </select>
</div>
        <select className={classes.input} value={draft.delegate||""} onChange={e=>setDraft({...draft, delegate:e.target.value})}><option value="">Delegat</option>{delegateNames.map(n=><option key={n} value={n}>{n}</option>)}</select>
        <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result||""} onChange={e=>setDraft({...draft, result:e.target.value})}/>
        <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes||""} onChange={e=>setDraft({...draft, notes:e.target.value})}/>
        <input
  className={classes.input}
  placeholder="Link do transmisji (opcjonalny)"
  value={draft.streamUrl || ""}
  onChange={e => setDraft({ ...draft, streamUrl: e.target.value })}
/>
        <div className="flex gap-2"><button onClick={saveDraft} className={clsx(classes.btnPrimary,"flex items-center gap-2")}><Save className="w-4 h-4"/>{editId?"Zapisz zmiany":"Dodaj mecz"}</button>{editId && (
  <button
    className={classes.btnSecondary}
    onClick={() => {
      setDraft({ ...blank, id: crypto.randomUUID() });
      setEditId(null);
      clearEditing?.();
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
    tests.push({name:"Delegat może dodać protokół", pass: canUploadReport(uDel, sample)===true});
    const canDownload=(u:{role:Role}|null)=>!!u && u.role!=='Guest'; tests.push({name:"Gość nie pobiera plików", pass: canDownload({role:'Guest' as Role})===false});
    tests.push({name:"Tylko delegat tego meczu może ustawić wynik", pass: canEditResult(uDel,sample)===true && canEditResult({role:'Delegate' as Role, name:'Inny Delegat'} as any,sample)===false });
  } else { tests.push({name:"Dane (z bazy) istnieją", pass:false, details:"Brak meczów do testu"}) }
  const selectedIdInitial:string=""; tests.push({name:"selectedId jest stringiem na starcie", pass: typeof selectedIdInitial==="string"}); return tests;
}
const Diagnostics: React.FC<{ state:AppState }> = ({ state }) => { const tests=runDiagnostics(state); const allPass=tests.every(t=>t.pass);
  return (<Section title="Diagnostyka (testy runtime)" icon={<Shield className="w-5 h-5"/>}><div className="mb-2 text-sm">Wynik: {allPass? <span className="text-green-700 font-semibold">OK</span> : <span className="text-red-700 font-semibold">BŁĘDY</span>}</div>
    <ul className="text-sm space-y-1">{tests.map((t,i)=>(<li key={i} className={t.pass?"text-green-700":"text-red-700"}>• {t.name} — {t.pass?"PASS":"FAIL"}{t.details?` (${t.details})`:''}</li>))}</ul></Section>)
}

type CompetitionMatchesViewProps = {
  mode: 'competition' | 'tournament';
  competitionSeasonId?: string | null;
  stageId?: string | null;
  tournamentId?: string | null;
  matches: Match[];
  penalties: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
  documents?: Match[];
  currentUser: { name: string; role: Role; club?: string } | null;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  clubs: readonly string[];
  refereeNames: string[];
  delegateNames: string[];
  delegateCandidateNames: string[];
  onRefreshMatches: () => void;
  loadingMatches: boolean;
  onRemovePenalty: (id: string) => void;
  onQuickEdit: (matchId: string) => void;
  onCancelEdit: () => void;
  editingMatchId?: string | null;
  tournamentClubs?: Map<string, TournamentClub[]>;
  showAddTournamentClubForm?: boolean;
  setShowAddTournamentClubForm?: React.Dispatch<React.SetStateAction<boolean>>;
  tournamentClubFormData?: { clubName: string };
  setTournamentClubFormData?: React.Dispatch<React.SetStateAction<{ clubName: string }>>;
  onAddTournamentClub?: (tournamentId: string) => void;
  onDeleteTournamentClub?: (clubId: string, tournamentId: string) => void;
  onAddMatch?: (tournamentId: string) => void;
};

const CompetitionMatchesView: React.FC<CompetitionMatchesViewProps> = ({
  mode,
  competitionSeasonId,
  stageId,
  tournamentId,
  matches,
  penalties,
  documents,
  currentUser,
  state,
  setState,
  clubs,
  refereeNames,
  delegateNames,
  delegateCandidateNames,
  onRefreshMatches,
  loadingMatches,
  onRemovePenalty,
  onQuickEdit,
  onCancelEdit,
  editingMatchId,
  tournamentClubs,
  showAddTournamentClubForm,
  setShowAddTournamentClubForm,
  tournamentClubFormData,
  setTournamentClubFormData,
  onAddTournamentClub,
  onDeleteTournamentClub,
  onAddMatch,
}) => {
  const effectiveMatches = documents ?? matches;
  const isCompetitionView = mode === 'competition';
  const isTournamentView = mode === 'tournament';
  const currentTournamentClubs = tournamentId ? (tournamentClubs?.get(tournamentId) ?? []) : [];

  const upcomingViewMatches = effectiveMatches.filter(m => !m.result || m.result.trim() === '');
  const finishedViewMatches = effectiveMatches.filter(m => !!m.result && m.result.trim() !== '');

  const matchesSection = effectiveMatches.length === 0 ? (
    <div className="p-2">
      <div className="text-sm text-gray-500 mb-2">Brak meczów w tym turnieju</div>
      {isTournamentView && currentUser && isAdmin(currentUser) && onAddMatch && tournamentId && (
        <button
          onClick={() => onAddMatch(tournamentId)}
          className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
        >
          + Dodaj mecz
        </button>
      )}
    </div>
  ) : (
    <div className="space-y-4 p-2">
      <MatchesTable
        title="Nadchodzące mecze"
        variant="upcoming"
        showExport
        state={{ ...state, matches: upcomingViewMatches }}
        setState={setState}
        user={currentUser ?? undefined}
        onRefresh={onRefreshMatches}
        loading={loadingMatches}
        penaltyMap={penalties}
        onRemovePenalty={onRemovePenalty}
        onQuickEdit={onQuickEdit}
        clubs={clubs}
        refereeNames={refereeNames}
        delegateNames={delegateCandidateNames}
        editingMatchId={editingMatchId}
        onCancelEdit={onCancelEdit}
      />

      <MatchesTable
        title="Zakończone mecze"
        variant="finished"
        sectionClassName="bg-white/60"
        state={{ ...state, matches: finishedViewMatches }}
        setState={setState}
        user={currentUser ?? undefined}
        onRefresh={onRefreshMatches}
        loading={loadingMatches}
        penaltyMap={penalties}
        onRemovePenalty={onRemovePenalty}
        onQuickEdit={onQuickEdit}
        clubs={clubs}
        refereeNames={refereeNames}
        delegateNames={delegateCandidateNames}
        editingMatchId={editingMatchId}
        onCancelEdit={onCancelEdit}
      />

      {isTournamentView && currentUser && isAdmin(currentUser) && onAddMatch && tournamentId && (
        <button
          onClick={() => onAddMatch(tournamentId)}
          className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
        >
          + Dodaj mecz
        </button>
      )}
    </div>
  );

  if (isCompetitionView) {
    return (
      <>
        <RankingTable matches={state.matches} clubs={clubs as string[]} />

        {matchesSection}

        {currentUser && isAdmin(currentUser) && (
          <AdminPanel
            state={state}
            setState={setState}
            clubs={clubs}
            refereeNames={refereeNames}
            delegateNames={delegateCandidateNames}
            onAfterChange={() => { onRefreshMatches(); }}
            canWrite={true}
            editingMatchId={editingMatchId}
            clearEditing={onCancelEdit}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold text-gray-900">Drużyny w turnieju</div>
              <div className="text-sm text-gray-500">Dodaj i usuń kluby przypisane do tego turnieju.</div>
            </div>
            {currentUser && isAdmin(currentUser) && setShowAddTournamentClubForm && (
              <button
                onClick={() => setShowAddTournamentClubForm(prev => !prev)}
                className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
              >
                {showAddTournamentClubForm ? 'Ukryj formularz' : '+ Dodaj klub'}
              </button>
            )}
          </div>

          {currentUser && isAdmin(currentUser) && showAddTournamentClubForm && tournamentClubFormData && setTournamentClubFormData && onAddTournamentClub && tournamentId && (
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={tournamentClubFormData.clubName}
                  onChange={e => setTournamentClubFormData({ clubName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wybierz klub</option>
                  {clubs.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => onAddTournamentClub(tournamentId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Dodaj klub
                </button>
              </div>
            </div>
          )}

          {currentTournamentClubs.length === 0 ? (
            <div className="text-sm text-gray-500">Brak przypisanych drużyn do tego turnieju.</div>
          ) : (
            <div className="space-y-2">
              {currentTournamentClubs.map(club => (
                <div key={club.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span>{club.club_name}</span>
                  {currentUser && isAdmin(currentUser) && onDeleteTournamentClub && tournamentId && (
                    <button
                      onClick={() => onDeleteTournamentClub(club.id, tournamentId)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >Usuń</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {currentTournamentClubs.length > 0 && (
          <RankingTable matches={effectiveMatches} clubs={currentTournamentClubs.map(c => c.club_name)} />
        )}
      </div>

      {matchesSection}
    </div>
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
const { userId, userDisplay, role: sRole, signOut } = useSupabaseAuth()

// Zalogowany = mamy session (userId), rola może być nawet 'Guest'
const supaUser = userId
  ? ({ name: userDisplay, role: sRole as Role } as { name: string; role: Role })
  : null
// demo fallback
const [demoUser, setDemoUser] = useState<{name:string; role:Role; club?:string} | null>(null);

useEffect(() => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("wpr-auth-user") : null;
    if (raw) setDemoUser(JSON.parse(raw));
  } catch {}
}, []);
  function demoLogin(n:string,r:Role,c?:string){ const u={name:n, role:r, club:c}; setDemoUser(u); localStorage.setItem("wpr-auth-user", JSON.stringify(u)); }
  function demoLogout(){ setDemoUser(null); localStorage.removeItem("wpr-auth-user"); }
  // === Auth user z Supabase (id + email) – użyjemy do dopasowania profilu po id ===
const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    const u = data.user;
    setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
  });
}, [userId]);
// MÓJ profil (upsert + select)
const [myProfile, setMyProfile] = useState<ProfileRow | null>(null);

useEffect(() => {
  (async () => {
    if (!authUser?.id) { setMyProfile(null); return; }

    // 1) Upewnij się, że rekord w 'profiles' istnieje (RLS: insert gdy id=auth.uid())
    await supabase
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          display_name: userDisplay || authUser.email || "Użytkownik",
          role: "Guest",     // domyślna rola (admin później podnosi)
          club_id: null
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

    // 2) Wczytaj profil (RLS: id = auth.uid())
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, club_id")
      .eq("id", authUser.id)
      .single();

    if (error || !data) {
      console.warn("profiles select error:", error?.message);
      setMyProfile(null);
      return;
    }

    // 3) Dociągnij nazwę klubu (jeśli RLS na 'clubs' pozwala)
    let clubName: string | null = null;
    if (data.club_id) {
      const { data: clubRow, error: clubErr } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", data.club_id)
        .maybeSingle();
      if (!clubErr && clubRow?.name) clubName = clubRow.name;
    }

    setMyProfile({
      id: data.id,
      display_name: data.display_name,
      role: data.role as Role,
      club_id: data.club_id,
      club_name: clubName,
    });
  })();
  // zależności: zmiana userId/nicka ma odświeżyć profil
}, [authUser?.id, userDisplay, authUser?.email]);


// --- quick edit (Admin): otwieraj edycję inline pod wybranym meczem ---
const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

function handleQuickEdit(matchId: string) {
  setEditingMatchId((current) => (current === matchId ? null : matchId));
}

function handleCancelInlineEdit() {
  setEditingMatchId(null);
}
// === [3.3] PROSTA NAWIGACJA ARTYKUŁÓW (mini-router) ===
const [page, setPage] = useState<'home' | 'articles' | 'article' | 'editor' | 'moderation' | 'register' | 'approvals'>('home');
  function openModeration() { setPage('moderation'); }
const [openedArticleId, setOpenedArticleId] = useState<string | null>(null);

function goHome() { setPage('home'); setOpenedArticleId(null); }
function openArticles() { setPage('articles'); }
function openArticle(id: string) { setOpenedArticleId(id); setPage('article'); }
function openEditor(newId?: string | null) {
  setOpenedArticleId(newId ?? null);
  setPage('editor');
}

const [activePage, setActivePage] = useState<'dashboard' | 'matches' | 'my-matches' | 'club' | 'ktpw' | 'admin'>('dashboard');

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

  // --- Competitions (rozgrywki) --- Layer 1
  const fallbackCompetitions: Competition[] = [
    { id: 'fallback-ekstraklasa', name: 'Ekstraklasa', short_name: 'EKS', type: 'league', level: 'senior', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
    { id: 'fallback-puchar-polski', name: 'Puchar Polski', short_name: 'PP', type: 'cup', level: 'senior', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
    { id: 'fallback-u23', name: 'U23', short_name: 'U23', type: 'league', level: 'U23', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
    { id: 'fallback-u19', name: 'U19', short_name: 'U19', type: 'league', level: 'U19', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
    { id: 'fallback-u17', name: 'U17', short_name: 'U17', type: 'league', level: 'U17', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
    { id: 'fallback-u15', name: 'U15', short_name: 'U15', type: 'league', level: 'U15', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
    { id: 'fallback-u13', name: 'U13', short_name: 'U13', type: 'league', level: 'U13', gender: 'men', country: 'PL', active: true, description: null, created_at: new Date().toISOString() },
  ];
const [competitions, setCompetitions] = useState<Competition[]>([]);
const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
const [selectedCompetitionSeason, setSelectedCompetitionSeason] = useState<CompetitionSeason | null>(null);
const [loadingCompetitions, setLoadingCompetitions] = useState(false);

const refreshCompetitions = React.useCallback(async () => {
  setLoadingCompetitions(true);
  try {
    const comps = await listCompetitions();
    setCompetitions(comps);

    setSelectedCompetitionId((current) => {
      if (current && comps.some((c) => c.id === current)) {
        return current;
      }

      const ekstraklasa = comps.find(
        (c) => c.name === 'Ekstraklasa' || c.short_name === 'EKS'
      );
      return ekstraklasa?.id || comps[0]?.id || null;
    });

    const ekstraklasa = comps.find((c) => c.name === 'Ekstraklasa');
    if (ekstraklasa) {
      // Znajdź sezon 2025/2026 dla Ekstraklasy
      try {
        const { data: seasons, error: seErr } = await supabase
          .from('seasons')
          .select('id')
          .eq('name', '2025/2026')
          .single();

        if (!seErr && seasons) {
          const compSeason = await getCompetitionSeason(ekstraklasa.id, seasons.id);
          setSelectedCompetitionSeason(compSeason);
        }
      } catch (e) {
        console.warn('[refreshCompetitions] sezon lookup failed', e);
      }
    }
  } catch (e: any) {
    console.warn('[refreshCompetitions] error', e?.message);
  }
  setLoadingCompetitions(false);
}, []);

useEffect(() => {
  refreshCompetitions();
}, [refreshCompetitions]);

useEffect(() => {
  if (!selectedCompetitionId) {
    const fallbackEkstraklasa = fallbackCompetitions.find(c => c.name === 'Ekstraklasa');
    setSelectedCompetitionId(fallbackEkstraklasa?.id ?? fallbackCompetitions[0].id);
  }
}, [selectedCompetitionId, fallbackCompetitions]);

const handleCompetitionChange = async (competitionId: string) => {
  setSelectedCompetitionId(competitionId);
  setSelectedCompetitionSeason(null);

  if (competitionId.startsWith('fallback-')) {
    return;
  }

  // Pobierz sezon 2025/2026
  try {
    const { data: seasons, error: seErr } = await supabase
      .from('seasons')
      .select('id')
      .eq('name', '2025/2026')
      .single();

    if (!seErr && seasons) {
      const compSeason = await getCompetitionSeason(competitionId, seasons.id);
      setSelectedCompetitionSeason(compSeason);
    }
  } catch (e) {
    console.warn('[handleCompetitionChange] error', e);
  }
};

  // Layer 1.5: Stages and Tournaments
  const [stages, setStages] = useState<Stage[]>([]);
  const [tournaments, setTournaments] = useState<Map<string, Tournament[]>>(new Map());
  const [loadingStages, setLoadingStages] = useState(false);
  
  // Form states for adding stage/tournament
  const [showAddStageForm, setShowAddStageForm] = useState(false);
  const [stageFormData, setStageFormData] = useState({
    name: '',
    type: 'round_robin',
    startDate: '',
    endDate: '',
  });
  
  const [showAddTournamentForm, setShowAddTournamentForm] = useState(false);
  const [selectedStageForTournament, setSelectedStageForTournament] = useState<string | null>(null);
  const [tournamentFormData, setTournamentFormData] = useState({
    name: '',
    type: 'league',
    startDate: '',
    endDate: '',
  });

  // Layer 1.6: Tournament Matches
  const [showAddMatchForm, setShowAddMatchForm] = useState(false);
  const [selectedTournamentForMatch, setSelectedTournamentForMatch] = useState<string | null>(null);
  const [matchFormData, setMatchFormData] = useState({
    date: '',
    time: '',
    location: '',
    round: '',
    series_round: '',
    home: '',
    away: '',
    referee1: '',
    referee2: '',
    delegate: '',
  });

  const [tournamentClubs, setTournamentClubs] = useState<Map<string, TournamentClub[]>>(new Map());
  const [selectedTournamentClub, setSelectedTournamentClub] = useState<string | null>(null);
  const [showAddTournamentClubForm, setShowAddTournamentClubForm] = useState(false);
  const [tournamentClubFormData, setTournamentClubFormData] = useState({ clubName: '' });

  const refreshTournamentClubs = React.useCallback(async (tournamentId: string) => {
    try {
      const clubs = await listTournamentClubs(tournamentId);
      setTournamentClubs(prev => new Map(prev).set(tournamentId, clubs));
    } catch (e) {
      console.warn('[refreshTournamentClubs] error', e);
    }
  }, []);

  const refreshStages = React.useCallback(async () => {
    if (!selectedCompetitionSeason) return;
    
    setLoadingStages(true);
    try {
      const stagesList = await listStages(selectedCompetitionSeason.id);
      setStages(stagesList);
      
      // Pobierz turnieje dla każdego etapu
      const tournamentsMap = new Map<string, Tournament[]>();
      
      for (const stage of stagesList) {
        const tourns = await listTournaments(stage.id);
        tournamentsMap.set(stage.id, tourns);
      }
      setTournaments(tournamentsMap);

      // Pobierz przypisane kluby dla wszystkich turniejów
      await Promise.all(
        Array.from(tournamentsMap.values()).flat().map((t) => refreshTournamentClubs(t.id))
      );
    } catch (e) {
      console.warn('[refreshStages] error', e);
    }
    setLoadingStages(false);
  }, [selectedCompetitionSeason, refreshTournamentClubs]);

  useEffect(() => {
    // Załaduj stages tylko dla kategorii innych niż Ekstraklasa
    if (selectedCompetitionSeason && selectedCompetitionSeason.competition_id !== competitions.find(c => c.name === 'Ekstraklasa')?.id) {
      refreshStages();
    }
  }, [selectedCompetitionSeason, competitions, refreshStages]);

  useEffect(() => {
    if (!selectedTournamentForMatch) return;
    refreshTournamentClubs(selectedTournamentForMatch);
  }, [selectedTournamentForMatch, refreshTournamentClubs]);

  const handleAddStage = async () => {
    if (!selectedCompetitionSeason || !stageFormData.name.trim()) return;

    try {
      await addStage(
        selectedCompetitionSeason.id,
        stageFormData.name.trim(),
        stageFormData.type,
        stageFormData.startDate,
        stageFormData.endDate
      );
      
      setStageFormData({ name: '', type: 'round_robin', startDate: '', endDate: '' });
      setShowAddStageForm(false);
      await refreshStages();
    } catch (e) {
      console.error('[handleAddStage] error', e);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten etap?')) return;

    try {
      await deleteStage(stageId);
      await refreshStages();
    } catch (e) {
      console.error('[handleDeleteStage] error', e);
    }
  };

  const handleAddTournament = async () => {
    if (!selectedStageForTournament || !tournamentFormData.name.trim()) return;

    try {
      await addTournament(
        selectedStageForTournament,
        tournamentFormData.name.trim(),
        tournamentFormData.type,
        tournamentFormData.startDate,
        tournamentFormData.endDate
      );
      
      setTournamentFormData({ name: '', type: 'league', startDate: '', endDate: '' });
      setShowAddTournamentForm(false);
      setSelectedStageForTournament(null);
      await refreshStages();
    } catch (e) {
      console.error('[handleAddTournament] error', e);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten turniej?')) return;

    try {
      await deleteTournament(tournamentId);
      await refreshStages();
    } catch (e) {
      console.error('[handleDeleteTournament] error', e);
    }
  };

  const handleAddTournamentClub = async (tournamentId: string) => {
    if (!tournamentClubFormData.clubName.trim()) return;

    try {
      await addTournamentClub(tournamentId, tournamentClubFormData.clubName.trim());
      setTournamentClubFormData({ clubName: '' });
      await refreshTournamentClubs(tournamentId);
    } catch (e) {
      console.error('[handleAddTournamentClub] error', e);
    }
  };

  const handleDeleteTournamentClub = async (clubId: string, tournamentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten klub z turnieju?')) return;

    try {
      await deleteTournamentClub(clubId);
      await refreshTournamentClubs(tournamentId);
    } catch (e) {
      console.error('[handleDeleteTournamentClub] error', e);
    }
  };

  const handleAddMatch = async () => {
    if (!selectedTournamentForMatch) {
      alert('Wybierz turniej przed dodaniem meczu.');
      return;
    }

    const clubsForCurrentTournament = tournamentClubs.get(selectedTournamentForMatch) ?? [];
    if (clubsForCurrentTournament.length === 0) {
      alert('Najpierw dodaj drużyny do turnieju.');
      return;
    }

    if (!matchFormData.date.trim() || !matchFormData.location.trim() || !matchFormData.home.trim() || !matchFormData.away.trim()) {
      alert('Wypełnij wszystkie pola: datę, miejsce, gospodarza i gości');
      return;
    }

    if (matchFormData.home === matchFormData.away) {
      alert('Gospodarz i goście muszą być różnymi klubami');
      return;
    }

    if (matchFormData.referee1 && matchFormData.referee1 === matchFormData.referee2) {
      alert('Sędzia 1 i Sędzia 2 nie mogą być tacy sami');
      return;
    }

    try {
      const stage = stages.find(s => tournaments.get(s.id)?.find(t => t.id === selectedTournamentForMatch));
      if (!stage || !selectedCompetitionSeason) return;

      await addTournamentMatch(
        selectedTournamentForMatch,
        stage.id,
        selectedCompetitionSeason.id,
        {
          date: matchFormData.date,
          time: matchFormData.time || undefined,
          location: matchFormData.location,
          round: matchFormData.round || undefined,
          series_round: matchFormData.series_round || undefined,
          home: matchFormData.home,
          away: matchFormData.away,
          referee1: matchFormData.referee1 || undefined,
          referee2: matchFormData.referee2 || undefined,
          delegate: matchFormData.delegate || undefined,
        }
      );

      setMatchFormData({
        date: '',
        time: '',
        location: '',
        round: '',
        series_round: '',
        home: '',
        away: '',
        referee1: '',
        referee2: '',
        delegate: '',
      });
      setShowAddMatchForm(false);
      setSelectedTournamentForMatch(null);
      await refreshMatches();
      await refreshStages();
    } catch (e) {
      console.error('[handleAddMatch] error', e);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten mecz?')) return;

    try {
      await deleteTournamentMatch(matchId);
      await refreshMatches();
      await refreshStages();
    } catch (e) {
      console.error('[handleDeleteMatch] error', e);
    }
  };
  
  // Load profiles (for admin select lists)
  const [profiles,setProfiles]=useState<ProfileRow[]>([])
  const [loadingProfiles,setLoadingProfiles]=useState(false)
async function refreshProfiles() {
  // Tę listę wykorzystujesz w panelu admina – rób to tylko jako Admin.
  setLoadingProfiles(true);

  // 1) Bez JOIN – same profile
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, club_id")
    .order("display_name", { ascending: true });

  if (error || !data) {
    console.warn("refreshProfiles error:", error?.message);
    setProfiles([]);
    setLoadingProfiles(false);
    return;
  }

  // 2) Opcjonalnie dociągnij nazwy klubów (jeśli RLS na clubs pozwoli)
  const rows: ProfileRow[] = data.map(r => ({
    id: r.id,
    display_name: r.display_name,
    role: r.role as Role,
    club_id: r.club_id,
    club_name: null,
  }));

  // Zbierz unikalne club_id, dociągnij hurtowo (jeśli są)
  const clubIds = Array.from(new Set(rows.map(r => r.club_id).filter(Boolean))) as string[];
  if (clubIds.length) {
    const { data: clubsRows, error: clubsErr } = await supabase
      .from("clubs")
      .select("id, name")
      .in("id", clubIds);

    if (!clubsErr && clubsRows) {
      const byId = new Map(clubsRows.map(c => [c.id, c.name as string]));
      rows.forEach(r => { if (r.club_id) r.club_name = byId.get(r.club_id) ?? null; });
    }
  }

  setProfiles(rows);
  setLoadingProfiles(false);
}
const effectiveUser = useMemo(() => {
  if (supaUser) {
    const finalRole = (myProfile?.role ?? supaUser.role) as Role;
    const club = finalRole === "Club" ? (myProfile?.club_name ?? undefined) : undefined;
    return { name: userDisplay, role: finalRole, club };
  }
  return demoUser;
}, [supaUser, myProfile?.role, myProfile?.club_name, userDisplay, demoUser]);

const showMyMatches = !!effectiveUser && (isReferee(effectiveUser) || isDelegate(effectiveUser) || isAdmin(effectiveUser));
const showClubTab = !!effectiveUser && isClub(effectiveUser);
const showKtpwTab = !!effectiveUser;
const showAdminTab = !!effectiveUser && isAdmin(effectiveUser);

useEffect(() => {
  // Ładuj profile tylko gdy jestem Adminem
  if (effectiveUser?.role && effectiveUser.role.toString().includes("Admin")) {
    refreshProfiles();
  } else {
    setProfiles([]); // opcjonalne czyszczenie, żeby nic nie „przeciekało”
  }
}, [effectiveUser?.role]);
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

  const seasonKey = (m: Match) => m.competitionSeasonId ?? "__legacy__";

  // pomocniczo: wszystkie mecze danej drużyny posortowane po dacie
  function clubSchedule(club: string, contextKey: string) {
    return matches
      .filter(m => (m.home === club || m.away === club) && seasonKey(m) === contextKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  penalties.forEach(p => {
    const club = p.club_name;

    // mecz, po którym kara została nałożona
    const startMatch = byId.get(p.match_id);
    if (!startMatch) return;

    // Kara działa tylko w obrębie tej samej kategorii/competition season.
    // Dla meczów bez competitionSeasonId utrzymujemy osobny legacy kontekst.
    const contextKey = seasonKey(startMatch);
    const schedule = clubSchedule(club, contextKey);

    // Indeks tego meczu w terminarzu klubu. Kara obowiązuje OD KOLEJNEGO meczu.
    let startIdx = schedule.findIndex(m => m.id === startMatch.id);
    if (startIdx < 0) {
      // fallback: szukamy pierwszego meczu PO dacie utworzenia, nadal w tym samym kontekście
      const created = new Date(p.created_at);
      startIdx = schedule.findIndex(m => new Date(m.date) > created) - 1;
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

function getMyMatchRole(user: { name?: string } | null | undefined, match: Match) {
  const name = user?.name?.trim();
  if (!name) return null;
  if (match.delegate?.trim() === name) return "Delegat";
  if (match.referees[0]?.trim() === name) return "Sędzia 1";
  if (match.referees[1]?.trim() === name) return "Sędzia 2";
  return null;
}

const myMatches = useMemo(() => {
  const name = effectiveUser?.name?.trim();
  if (!name) return [];

  return state.matches.filter((match) => {
    const role = getMyMatchRole(effectiveUser, match);
    return !!role;
  });
}, [effectiveUser, state.matches]);

const myUpcomingMatches = useMemo(
  () => myMatches.filter((match) => !match.result || match.result.trim() === ""),
  [myMatches]
);

const myFinishedMatches = useMemo(
  () => myMatches.filter((match) => !!match.result && match.result.trim() !== ""),
  [myMatches]
);

const formatMatchDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit" })
    .replace(/\./g, "-");

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
    seriesRound: r.series_round || null,
  location: r.location,
  home: r.home,
  away: r.away,
  result: r.result || "",
  shootout: !!r.shootout,                
  referees: [r.referee1 || "", r.referee2 || ""],
  delegate: r.delegate || "",
  tournamentId: r.tournament_id || null,
  stageId: r.stage_id || null,
  competitionSeasonId: r.competition_season_id || null,
  notes: r.notes || "",
  commsByClub: { home: null, away: null },
  rosterByClub: { home: null, away: null },
  matchReport: null,
  reportPhotos: [],
  uploadsLog: [],
  streamUrl: r.stream_url || null,
}));

    setState((s) => ({ ...s, matches }));


    
// Dociągnij metadane dokumentów z docs_meta i scal
try {
  // 👇 Jeśli realnie jesteśmy Gościem, nie czytamy docs_meta (RLS i tak nie pozwoli).
if (!effectiveUser || effectiveUser.role === "Guest") {
  setLoadingMatches(false);
  return;
}

  const matchIds = matches.map((m) => m.id);
  if (matchIds.length > 0) {
const { data: docs, error: docsErr } = await supabase
  .from("docs_meta")
  .select("match_id, kind, club_or_neutral, path, label, created_at")
  .in("match_id", matchIds)
  .order("created_at", { ascending: false }); 


    if (docsErr) throw docsErr;

    const nextMatches = matches.map((m) => {
  const mm = { ...m };
  const d = (docs || []).filter((x) => x.match_id === m.id);

  // ujednolicenie zapisu klubów (tak samo jak w ścieżce w Storage)
const norm = normKey;


for (const x of d) {
  if (x.kind === "comms" && x.club_or_neutral === norm(m.home)) {
    if (!mm.commsByClub.home) {
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
  }

  if (x.kind === "roster") {
    const target =
      x.club_or_neutral === norm(m.home) ? "home" :
      x.club_or_neutral === norm(m.away) ? "away" : null;

    if (target && !mm.rosterByClub[target]) {
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
    if (!mm.matchReport) {
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
  }

  if (x.kind === "photos") {
    // zdjęcia mogą być wiele – dodawaj wszystkie
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
// === DODAJ: dołącz moją dostępność, jeśli jestem sędzią (tri-state) ===
try {
  if (effectiveUser && effectiveUser.role === "Referee") {
    const matchIds2 = (nextMatches || []).map(m => m.id);
    if (matchIds2.length > 0) {
      const myAvail = await getMyAvailabilityForMatches(matchIds2); 
      setState(s => ({
        ...s,
        matches: s.matches.map(m => {
          const v = myAvail.get(m.id);
          return {
            ...m,
            myAvailable: v === true ? true : false,          
            myAvailabilitySet: v !== undefined            
          };
        })
      }));
    }
  }
} catch (e:any) {
  console.warn("Availability fetch failed:", e.message);
}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [effectiveUser?.role]);

const refereeNames = profiles.filter(p => hasRole(p, "Referee")).map(p => p.display_name).filter(Boolean);
const delegateNames = profiles.filter(p => hasRole(p, "Delegate")).map(p => p.display_name).filter(Boolean);
const delegateCandidateNames = Array.from(new Set([
  ...delegateNames,
  ...refereeNames,
]));

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
<img
  src="/logo.png"
  alt="WPOLO.PL"
  className="
    shrink-0
    h-16 w-16              /* większe: 64x64 na mobile */
    sm:h-20 sm:w-20        /* 80x80 na większych ekranach */
    md:h-24 md:w-24        /* 96x96 na desktopie */
    object-contain         /* zachowuje proporcje */
    rounded-none           /* brak zaokrągleń */
    bg-transparent         /* całkowicie przezroczyste tło */
    shadow-none            /* usuwa cień */
  "
/>
    <div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
        WPOLO.PL - Piłka wodna w Polsce
      </h1>
      <p className="text-sm text-gray-600">
        Portal dla ludzi w czekpu urodzonych.
      </p>
    </div>
  </div>

   <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
    
{/* Zalogowany vs. niezalogowany */}
{effectiveUser ? (
  <div className="flex flex-wrap items-center gap-2 justify-end">
    <Badge tone="blue">
      {prettyRole(effectiveUser.role)}
      {effectiveUser.club ? ` • ${effectiveUser.club}` : ""}
    </Badge>
    <span className="text-sm text-gray-700 truncate max-w-[40vw] sm:max-w-none">
      {effectiveUser.name}
    </span>

    <button onClick={signOut} className={classes.btnSecondary} title="Wyloguj">
      Wyloguj
    </button>

    {isEditor(effectiveUser) && (
      <button
        onClick={() => openEditor(null)}
        className={clsx(classes.btnPrimary, "whitespace-nowrap w-full sm:w-auto")}
        title="Utwórz nowy artykuł"
      >
        + Napisz artykuł
      </button>
    )}

    {isAdmin(effectiveUser) && (
      <>
        <button
          onClick={openModeration}
          className={clsx(classes.btnSecondary, "whitespace-nowrap w-full sm:w-auto")}
          title="Moderacja artykułów"
        >
          Moderacja
        </button>
        <button
          onClick={() => setPage('approvals')}
          className={clsx(classes.btnSecondary, "whitespace-nowrap w-full sm:w-auto")}
          title="Użytkownicy"
        >
          Użytkownicy
        </button>
      </>
    )}
  </div>
) : (
  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
    <div className="w-full min-w-0 sm:w-auto">
      <LoginBox classes={classes} />
    </div>
    <button
      className={clsx(classes.btnSecondary, "w-full sm:w-auto")}
      onClick={() => setPage('register')}
      title="Załóż konto, by móc komentować artykuły"
    >
      Rejestracja
    </button>
  </div>
)}
  </div>
</header>

<main className="max-w-6xl mx-auto grid gap-6">

  {/* === [3.3] HOME: pasek 3 najnowszych newsów + dotychczasowa strona === */}
  {page === 'home' && (
    <>
      <div className="rounded-2xl border border-white/40 bg-white/80 p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            className={clsx(classes.btnSecondary, activePage === 'dashboard' && 'bg-amber-600 text-white hover:bg-amber-700')}
            onClick={() => setActivePage('dashboard')}
          >
            Start
          </button>
          <button
            className={clsx(classes.btnSecondary, activePage === 'matches' && 'bg-amber-600 text-white hover:bg-amber-700')}
            onClick={() => setActivePage('matches')}
          >
            Rozgrywki
          </button>
          {showMyMatches && (
            <button
              className={clsx(classes.btnSecondary, activePage === 'my-matches' && 'bg-amber-600 text-white hover:bg-amber-700')}
              onClick={() => setActivePage('my-matches')}
            >
              Moje mecze
            </button>
          )}
          {showClubTab && (
            <button
              className={clsx(classes.btnSecondary, activePage === 'club' && 'bg-amber-600 text-white hover:bg-amber-700')}
              onClick={() => setActivePage('club')}
            >
              Mój klub
            </button>
          )}
          {showKtpwTab && (
            <button
              className={clsx(classes.btnSecondary, activePage === 'ktpw' && 'bg-amber-600 text-white hover:bg-amber-700')}
              onClick={() => setActivePage('ktpw')}
            >
              KTPW
            </button>
          )}
          {showAdminTab && (
            <button
              className={clsx(classes.btnSecondary, activePage === 'admin' && 'bg-amber-600 text-white hover:bg-amber-700')}
              onClick={() => setActivePage('admin')}
            >
              Admin
            </button>
          )}
        </div>
      </div>

      {activePage === 'dashboard' && (
        <>
          <NewsStrip onMore={openArticles} onOpen={openArticle} />
        </>
      )}

      {activePage === 'matches' && (
        <>
          {/* Competition Selector */}
          <div className="rounded-2xl border border-white/40 bg-white/80 p-3 shadow-sm mb-4">
            <div className="mb-2 text-sm font-semibold text-gray-700">Kategoria rozgrywek:</div>
            <div className="flex flex-wrap gap-2">
              {(competitions.length ? competitions : fallbackCompetitions).map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => handleCompetitionChange(comp.id)}
                  className={clsx(
                    "px-3 py-2 rounded-xl border text-sm font-medium transition",
                    selectedCompetitionId === comp.id
                      ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {comp.short_name || comp.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content for Ekstraklasa */}
          {selectedCompetitionSeason?.competition_id === competitions.find(c => c.name === 'Ekstraklasa')?.id ? (
            <CompetitionMatchesView
              mode="competition"
              competitionSeasonId={selectedCompetitionSeason?.id ?? null}
              matches={state.matches}
              penalties={penaltiesByMatch}
              documents={state.matches}
              currentUser={effectiveUser}
              state={state}
              setState={setState}
              clubs={clubs}
              refereeNames={refereeNames}
              delegateNames={delegateNames}
              delegateCandidateNames={delegateCandidateNames}
              onRefreshMatches={() => { refreshMatches(); refreshPenalties(); }}
              loadingMatches={loadingMatches}
              onRemovePenalty={handleRemovePenalty}
              onQuickEdit={handleQuickEdit}
              onCancelEdit={handleCancelInlineEdit}
              editingMatchId={editingMatchId}
            />
          ) : (
            // Layer 1.5: Stages and Tournaments UI
            <div className="space-y-4">
              <Section title={selectedCompetitionSeason?.name || 'Kategoria'} icon={<Shield className="w-5 h-5" />} className="bg-white/60">
                {loadingStages ? (
                  <div className="text-gray-500">Ładowanie etapów...</div>
                ) : stages.length === 0 ? (
                  <div className="text-gray-500">
                    Brak etapów. {effectiveUser && isAdmin(effectiveUser) && 'Dodaj pierwszy etap.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stages.map(stage => (
                      <div key={stage.id} className="border-l-4 border-amber-600 pl-4 py-3 bg-amber-50 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{stage.name}</h3>
                            <p className="text-sm text-gray-600">
                              Typ: {stage.stage_type} 
                              {stage.start_date && ` • ${new Date(stage.start_date).toLocaleDateString('pl-PL')}`}
                            </p>
                          </div>
                          {effectiveUser && isAdmin(effectiveUser) && (
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-2 hover:bg-red-100 rounded transition"
                              title="Usuń etap"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>

                        {/* Turnieje w etapie */}
                        {tournaments.get(stage.id) && tournaments.get(stage.id)!.length > 0 ? (
                          <div className="mt-3 space-y-3 ml-2 border-t pt-2">
                            {tournaments.get(stage.id)!.map(tournament => (
                              <div key={tournament.id} className="bg-white border border-gray-200 rounded">
                                <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
                                  <div>
                                    <p className="font-medium text-gray-800">{tournament.name}</p>
                                    <p className="text-xs text-gray-500">
                                      Typ: {tournament.tournament_type}
                                      {tournament.start_date && ` • ${new Date(tournament.start_date).toLocaleDateString('pl-PL')}`}
                                    </p>
                                  </div>
                                  {effectiveUser && isAdmin(effectiveUser) && (
                                    <button
                                      onClick={() => handleDeleteTournament(tournament.id)}
                                      className="p-1 hover:bg-red-100 rounded transition"
                                      title="Usuń turniej"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                    </button>
                                  )}
                                </div>

                                <CompetitionMatchesView
                                  mode="tournament"
                                  competitionSeasonId={selectedCompetitionSeason?.id ?? null}
                                  stageId={stage.id}
                                  tournamentId={tournament.id}
                                  matches={state.matches.filter(m => m.tournamentId === tournament.id)}
                                  penalties={penaltiesByMatch}
                                  documents={state.matches.filter(m => m.tournamentId === tournament.id)}
                                  currentUser={effectiveUser}
                                  state={state}
                                  setState={setState}
                                  clubs={clubs}
                                  refereeNames={refereeNames}
                                  delegateNames={delegateNames}
                                  delegateCandidateNames={delegateCandidateNames}
                                  onRefreshMatches={refreshMatches}
                                  loadingMatches={loadingMatches}
                                  onRemovePenalty={handleRemovePenalty}
                                  onQuickEdit={handleQuickEdit}
                                  onCancelEdit={handleCancelInlineEdit}
                                  editingMatchId={editingMatchId}
                                  tournamentClubs={tournamentClubs}
                                  showAddTournamentClubForm={showAddTournamentClubForm}
                                  setShowAddTournamentClubForm={setShowAddTournamentClubForm}
                                  tournamentClubFormData={tournamentClubFormData}
                                  setTournamentClubFormData={setTournamentClubFormData}
                                  onAddTournamentClub={handleAddTournamentClub}
                                  onDeleteTournamentClub={handleDeleteTournamentClub}
                                  onAddMatch={(id) => {
                                    setSelectedTournamentForMatch(id);
                                    setShowAddMatchForm(true);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-gray-500 ml-2">
                            Brak turniejów w tym etapie
                          </div>
                        )}

                        {/* Przycisk do dodania turnieju */}
                        {effectiveUser && isAdmin(effectiveUser) && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                setSelectedStageForTournament(stage.id);
                                setShowAddTournamentForm(true);
                              }}
                              className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            >
                              + Dodaj turniej
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Przycisk do dodania etapu */}
              {effectiveUser && isAdmin(effectiveUser) && (
                <div>
                  {!showAddStageForm ? (
                    <button
                      onClick={() => setShowAddStageForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      + Dodaj etap
                    </button>
                  ) : (
                    <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
                      <h3 className="font-semibold mb-3 text-gray-800">Dodaj nowy etap</h3>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
                          <input
                            type="text"
                            value={stageFormData.name}
                            onChange={e => setStageFormData(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="np. Eliminacje Zachód"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                          <select
                            value={stageFormData.type}
                            onChange={e => setStageFormData(p => ({ ...p, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="round_robin">Round Robin</option>
                            <option value="group">Group Stage</option>
                            <option value="knockout">Knockout</option>
                            <option value="finals">Finals</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data startu</label>
                            <input
                              type="date"
                              value={stageFormData.startDate}
                              onChange={e => setStageFormData(p => ({ ...p, startDate: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data końca</label>
                            <input
                              type="date"
                              value={stageFormData.endDate}
                              onChange={e => setStageFormData(p => ({ ...p, endDate: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleAddStage}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            <Save className="w-4 h-4 inline mr-2" />
                            Dodaj etap
                          </button>
                          <button
                            onClick={() => {
                              setShowAddStageForm(false);
                              setStageFormData({ name: '', type: 'round_robin', startDate: '', endDate: '' });
                            }}
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Formularz dodania turnieju */}
              {effectiveUser && isAdmin(effectiveUser) && showAddTournamentForm && selectedStageForTournament && (
                <div className="border border-green-300 rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-3 text-gray-800">Dodaj nowy turniej</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Etap</label>
                      <select
                        value={selectedStageForTournament}
                        onChange={e => setSelectedStageForTournament(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {stages.map(stage => (
                          <option key={stage.id} value={stage.id}>{stage.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
                      <input
                        type="text"
                        value={tournamentFormData.name}
                        onChange={e => setTournamentFormData(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="np. Turniej Poznań"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                      <select
                        value={tournamentFormData.type}
                        onChange={e => setTournamentFormData(p => ({ ...p, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="league">League</option>
                        <option value="group">Group</option>
                        <option value="knockout">Knockout</option>
                        <option value="final">Final</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data startu</label>
                        <input
                          type="date"
                          value={tournamentFormData.startDate}
                          onChange={e => setTournamentFormData(p => ({ ...p, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data końca</label>
                        <input
                          type="date"
                          value={tournamentFormData.endDate}
                          onChange={e => setTournamentFormData(p => ({ ...p, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAddTournament}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Dodaj turniej
                      </button>
                      <button
                        onClick={() => {
                          setShowAddTournamentForm(false);
                          setSelectedStageForTournament(null);
                          setTournamentFormData({ name: '', type: 'league', startDate: '', endDate: '' });
                        }}
                        className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Formularz dodania meczu */}
              {effectiveUser && isAdmin(effectiveUser) && showAddMatchForm && selectedTournamentForMatch && (
                <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
                  <h3 className="font-semibold mb-3 text-gray-800">Dodaj nowy mecz</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                        <input
                          type="date"
                          value={matchFormData.date}
                          onChange={e => setMatchFormData(p => ({ ...p, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Godzina</label>
                        <input
                          type="time"
                          value={matchFormData.time}
                          onChange={e => setMatchFormData(p => ({ ...p, time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Miejsce *</label>
                      <input
                        type="text"
                        value={matchFormData.location}
                        onChange={e => setMatchFormData(p => ({ ...p, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="np. Basen Otwarty Poznań"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nr meczu / Round</label>
                        <input
                          type="text"
                          value={matchFormData.round}
                          onChange={e => setMatchFormData(p => ({ ...p, round: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="np. 1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Runda / Series Round</label>
                        <input
                          type="text"
                          value={matchFormData.series_round}
                          onChange={e => setMatchFormData(p => ({ ...p, series_round: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="np. 1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gospodarz *</label>
                        <select
                          value={matchFormData.home}
                          onChange={e => setMatchFormData(p => ({ ...p, home: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Wybierz gospodarza</option>
                          {(tournamentClubs.get(selectedTournamentForMatch || '') || []).map(c => (
                            <option key={c.id} value={c.club_name}>{c.club_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Goście *</label>
                        <select
                          value={matchFormData.away}
                          onChange={e => setMatchFormData(p => ({ ...p, away: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Wybierz gości</option>
                          {(tournamentClubs.get(selectedTournamentForMatch || '') || []).map(c => (
                            <option key={c.id} value={c.club_name}>{c.club_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sędzia 1</label>
                        <select
                          value={matchFormData.referee1}
                          onChange={e => setMatchFormData(p => ({ ...p, referee1: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Wybierz sędziego 1</option>
                          {refereeNames.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sędzia 2</label>
                        <select
                          value={matchFormData.referee2}
                          onChange={e => setMatchFormData(p => ({ ...p, referee2: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Wybierz sędziego 2</option>
                          {refereeNames.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delegat</label>
                        <select
                          value={matchFormData.delegate}
                          onChange={e => setMatchFormData(p => ({ ...p, delegate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Wybierz delegata</option>
                          {delegateNames.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAddMatch}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Dodaj mecz
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMatchForm(false);
                          setSelectedTournamentForMatch(null);
                          setMatchFormData({
                            date: '',
                            time: '',
                            location: '',
                            round: '',
                            series_round: '',
                            home: '',
                            away: '',
                            referee1: '',
                            referee2: '',
                            delegate: '',
                          });
                        }}
                        className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activePage === 'ktpw' && (
        <Ktpw effectiveUser={effectiveUser} isAdmin={effectiveUser ? isAdmin(effectiveUser) : false} />
      )}

      {activePage === 'admin' && effectiveUser && isAdmin(effectiveUser) && (
        <>
          <AdminPanel
            state={state}
            setState={setState}
            clubs={clubs}
            refereeNames={refereeNames}
            delegateNames={delegateCandidateNames}
            onAfterChange={() => { refreshMatches(); refreshClubs(); }}
            canWrite={true}
            editingMatchId={editingMatchId}
            clearEditing={() => setEditingMatchId(null)}
          />

          <Section title="Administracja" icon={<Shield className="w-5 h-5" />} className="bg-white/60">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className={clsx(classes.btnSecondary, "w-full")}
                onClick={openModeration}
              >
                Moderacja artykułów
              </button>
              <button
                className={clsx(classes.btnSecondary, "w-full")}
                onClick={() => setPage('approvals')}
              >
                Lista użytkowników
              </button>
            </div>
          </Section>

          <Diagnostics state={state} />
        </>
      )}

      {activePage === 'my-matches' && effectiveUser && (isReferee(effectiveUser) || isDelegate(effectiveUser) || isAdmin(effectiveUser)) && (
        <Section title="Moje mecze" icon={<Users className="w-5 h-5" />} className="bg-white/60">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <div className="mb-3 text-sm font-semibold text-slate-700">Najbliższe mecze</div>
              <div className="space-y-2">
                {myUpcomingMatches.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak nadchodzących meczów.</div>
                ) : (
                  myUpcomingMatches.map((match) => (
                    <div key={match.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="font-medium">{formatMatchDate(match.date)}{match.time ? ` ${match.time}` : ""}</div>
                      <div className="text-xs text-gray-600">{match.location}</div>
                      <div className="mt-1 font-medium">{match.home} vs {match.away}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        Rola: <span className="font-medium text-slate-700">{getMyMatchRole(effectiveUser, match)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <div className="mb-3 text-sm font-semibold text-slate-700">Mecze zakończone</div>
              <div className="space-y-2">
                {myFinishedMatches.length === 0 ? (
                  <div className="text-sm text-gray-500">Brak zakończonych meczów.</div>
                ) : (
                  myFinishedMatches.map((match) => (
                    <div key={match.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="font-medium">{formatMatchDate(match.date)}{match.time ? ` ${match.time}` : ""}</div>
                      <div className="text-xs text-gray-600">{match.location}</div>
                      <div className="mt-1 font-medium">{match.home} vs {match.away}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        Rola: <span className="font-medium text-slate-700">{getMyMatchRole(effectiveUser, match)}</span>
                      </div>
                      {match.result && (
                        <div className="mt-1 text-xs text-slate-600">Wynik: {match.result}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Section>
      )}

      {activePage === 'club' && (
        <Section title="Mój klub" icon={<Users className="w-5 h-5" />} className="bg-white/60">
          <div className="text-sm text-gray-700">
            Tutaj dodamy bazę zawodników klubu oraz cyfrowe zgłoszenia składów.
          </div>
        </Section>
      )}

      {activePage === 'my-matches' && (!effectiveUser || !(isReferee(effectiveUser) || isDelegate(effectiveUser) || isAdmin(effectiveUser))) && (
        <Section title="Moje mecze" icon={<Users className="w-5 h-5" />} className="bg-white/60">
          <div className="text-sm text-gray-500">Panel dostępny tylko dla sędziów, delegatów i adminów.</div>
        </Section>
      )}
    </>
  )}


{page === 'articles' && (
  <ArticleList
    onBack={goHome}          // „Strona główna”
    onGoList={() => setPage('articles')} // „Lista artykułów” 
    onOpen={(id: string) => openArticle(id)}
  />
)}

  {page === 'approvals' && effectiveUser && isAdmin(effectiveUser) && (
  <AdminUserApprovals onBack={() => setPage('home')} />
)}

{page === 'article' && openedArticleId && (
  <ArticleView
    id={openedArticleId}
    onGoHome={goHome}        // „Strona główna”
    onBack={() => setPage('articles')} // „Lista artykułów”
    onEdit={
      effectiveUser && isEditor(effectiveUser)
        ? () => openEditor(openedArticleId)
        : undefined
    }
  />
)}

  {/* === [3.3] EDYTOR ARTYKUŁU (Admin/Editor) === */}
{page === 'editor' && (
  <ArticleEditor
    articleId={openedArticleId /* null = nowy */}
    onCancel={() => {
      if (openedArticleId) setPage('article'); else setPage('articles');
    }}
    onSaved={(id: string) => {
      setOpenedArticleId(id);
      setPage('article');
    }}
  />
)}
{page === 'moderation' && effectiveUser && isAdmin(effectiveUser) && (
  <ArticleModeration
    onBack={goHome}
    onEdit={(id: string) => {
      setOpenedArticleId(id);
      setPage('editor');
    }}
  />
)}
{page === 'register' && (
  <RegisterForm onDone={() => setPage('home')} />
)}
</main>

    <footer className="max-w-6xl mx-auto mt-8 text-xs text-gray-500">
      <p>copyright Lukasz Krol 2025</p>
    </footer>
  </div>)
}



