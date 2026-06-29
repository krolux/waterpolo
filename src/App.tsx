/* App with Supabase CRUD for matches (Step 1) + docs kept in localStorage */
import React, { useEffect, useMemo, useState } from "react";
import { Download, Upload, FileText, Users, Shield, Trash2, Edit, LogIn, LogOut, Search, UploadCloud, Image, Settings, Table, Check, RefreshCw, X } from "lucide-react";
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { LoginBox } from './components/LoginBox'
import { supabase } from "./lib/supabase"
import { listMatches, createMatch, updateMatch as dbUpdateMatch, deleteMatch as dbDeleteMatch, setMatchResult } from './lib/matches'
import { addPenalty, listPenalties, deletePenalty, type Penalty } from "./lib/penalties";
import { uploadDoc } from "./lib/storage";
import { uploadImportCSV, triggerBulkImport } from "./lib/imports";
import { setMyAvailability, getMyAvailabilityForMatches, listAvailableReferees } from "./lib/availability";
import { namesOfAvailableReferees } from "./lib/availability";
import { listCompetitions, getCompetitionSeason, listTournamentMatches, type Competition, type CompetitionSeason } from "./lib/competitions";
import { useTournamentManagement } from "./hooks/useTournamentManagement";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { ClubDashboard } from "./components/dashboard/ClubDashboard";
import { MatchesPage } from "./components/pages/MatchesPage";
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
import { MatchesTable } from "./components/matches/MatchesTable";
import { CompetitionMatchesView } from "./components/matches/CompetitionMatchesView";
import { AdminPanel } from "./components/matches/AdminPanel";
import { MatchForm } from "./components/matches/MatchForm";
import { StageForm } from "./components/tournaments/StageForm";
import { TournamentForm } from "./components/tournaments/TournamentForm";
import type { Role, StoredFile, UploadLog, Match, AppState, ProfileRow } from "./types/wpolo";
import type { SaveRosterPayload } from "./types/rosters";



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
const [savedRosters, setSavedRosters] = useState<SaveRosterPayload[]>([]);

const handleSaveRoster = React.useCallback((payload: SaveRosterPayload) => {
  setSavedRosters((current) => {
    const next = [...current];
    const index = next.findIndex((item) =>
      item.mode === payload.mode &&
      item.clubName === payload.clubName &&
      (payload.mode === "tournament"
        ? item.tournamentId === payload.tournamentId
        : item.matchId === payload.matchId)
    );

    if (index >= 0) {
      next[index] = payload;
      return next;
    }

    next.push(payload);
    return next;
  });
}, []);

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

  const {
    stages,
    tournaments,
    loadingStages,
    tournamentClubs,
    showAddStageForm,
    setShowAddStageForm,
    stageFormData,
    setStageFormData,
    showAddTournamentForm,
    setShowAddTournamentForm,
    selectedStageForTournament,
    setSelectedStageForTournament,
    tournamentFormData,
    setTournamentFormData,
    showAddMatchForm,
    setShowAddMatchForm,
    selectedTournamentForMatch,
    setSelectedTournamentForMatch,
    matchFormData,
    setMatchFormData,
    showAddTournamentClubForm,
    setShowAddTournamentClubForm,
    tournamentClubFormData,
    setTournamentClubFormData,
    handleAddStage,
    handleDeleteStage,
    handleAddTournament,
    handleDeleteTournament,
    handleAddTournamentClub,
    handleDeleteTournamentClub,
    handleAddMatch,
    handleDeleteMatch,
  } = useTournamentManagement({
    selectedCompetitionSeason,
    competitions,
    refreshMatches,
  });
  
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
        <DashboardPage openArticles={openArticles} openArticle={openArticle} />
      )}

      {activePage === 'matches' && (
        <MatchesPage
          competitions={competitions}
          fallbackCompetitions={fallbackCompetitions}
          handleCompetitionChange={handleCompetitionChange}
          selectedCompetitionId={selectedCompetitionId}
          selectedCompetitionSeason={selectedCompetitionSeason}
          state={state}
          setState={setState}
          penaltiesByMatch={penaltiesByMatch}
          effectiveUser={effectiveUser}
          clubs={clubs}
          refereeNames={refereeNames}
          delegateNames={delegateNames}
          delegateCandidateNames={delegateCandidateNames}
          refreshMatches={refreshMatches}
          refreshPenalties={refreshPenalties}
          loadingMatches={loadingMatches}
          handleRemovePenalty={handleRemovePenalty}
          handleQuickEdit={handleQuickEdit}
          handleCancelInlineEdit={handleCancelInlineEdit}
          editingMatchId={editingMatchId}
          isAdmin={isAdmin}
          removeWholeSlot={removeWholeSlot}
          ExportImport={ExportImport}
          loadingStages={loadingStages}
          stages={stages}
          tournaments={tournaments}
          handleDeleteStage={handleDeleteStage}
          handleDeleteTournament={handleDeleteTournament}
          tournamentClubs={tournamentClubs}
          showAddTournamentClubForm={showAddTournamentClubForm}
          setShowAddTournamentClubForm={setShowAddTournamentClubForm}
          tournamentClubFormData={tournamentClubFormData}
          setTournamentClubFormData={setTournamentClubFormData}
          handleAddTournamentClub={handleAddTournamentClub}
          handleDeleteTournamentClub={handleDeleteTournamentClub}
          setSelectedTournamentForMatch={setSelectedTournamentForMatch}
          setShowAddMatchForm={setShowAddMatchForm}
          showAddStageForm={showAddStageForm}
          setShowAddStageForm={setShowAddStageForm}
          stageFormData={stageFormData}
          setStageFormData={setStageFormData}
          handleAddStage={handleAddStage}
          showAddTournamentForm={showAddTournamentForm}
          setShowAddTournamentForm={setShowAddTournamentForm}
          selectedStageForTournament={selectedStageForTournament}
          setSelectedStageForTournament={setSelectedStageForTournament}
          tournamentFormData={tournamentFormData}
          setTournamentFormData={setTournamentFormData}
          handleAddTournament={handleAddTournament}
          showAddMatchForm={showAddMatchForm}
          selectedTournamentForMatch={selectedTournamentForMatch}
          matchFormData={matchFormData}
          setMatchFormData={setMatchFormData}
          handleAddMatch={handleAddMatch}
          savedRosters={savedRosters}
        />
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
        <ClubDashboard
          effectiveUser={effectiveUser}
          matches={state.matches}
          tournamentNamesById={Object.fromEntries(Array.from(tournaments.values()).flat().map((t) => [t.id, t.name]))}
          penaltiesByMatch={penaltiesByMatch}
          onSaveRoster={handleSaveRoster}
        />
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



