/* App with Supabase CRUD for matches (Step 1) + docs kept in localStorage */
import React, { useEffect, useMemo, useState } from "react";
import { FileText, Users, Shield, House, Trophy, CalendarDays, FlaskConical } from "lucide-react";
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { LoginBox } from './components/LoginBox'
import { supabase } from "./lib/supabase"
import { listMatches } from './lib/matches'
import { listPenalties, type Penalty } from "./lib/penalties";
import { getMyAvailabilityForMatches } from "./lib/availability";
import { listCompetitions, type Competition, type CompetitionSeason } from "./lib/competitions";
import { useTournamentManagement } from "./hooks/useTournamentManagement";
import { HomePortalPage } from "./components/pages/HomePortalPage";
import { RegisterForm } from "./components/RegisterForm";
import { Section } from "./components/shared/Section";
import { Badge } from "./components/shared/Badge";
import type { Role, Match, AppState, ProfileRow } from "./types/wpolo";
import type { SaveRosterPayload } from "./types/rosters";
import type { CompetitionCode } from "./lib/competitionsV2";

const CompetitionsPageV2 = React.lazy(() => import("./components/pages/CompetitionsPageV2").then(module => ({ default: module.CompetitionsPageV2 })));
const ClubDashboard = React.lazy(() => import("./components/dashboard/ClubDashboard").then(module => ({ default: module.ClubDashboard })));
const DemoPage = React.lazy(() => import("./components/pages/DemoPage").then(module => ({ default: module.DemoPage })));
const Ktpw = React.lazy(() => import("./components/Ktpw"));
const AdminPanel = React.lazy(() => import("./components/matches/AdminPanel").then(module => ({ default: module.AdminPanel })));
const ArticleList = React.lazy(() => import("./components/ArticleList").then(module => ({ default: module.ArticleList })));
const ArticleView = React.lazy(() => import("./components/ArticleView").then(module => ({ default: module.ArticleView })));
const ArticleEditor = React.lazy(() => import("./components/ArticleEditor").then(module => ({ default: module.ArticleEditor })));
const ArticleModeration = React.lazy(() => import("./components/ArticleModeration").then(module => ({ default: module.ArticleModeration })));
const AdminUserApprovals = React.lazy(() => import("./components/AdminUserApprovals").then(module => ({ default: module.AdminUserApprovals })));



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


const classes = {
  input: "w-full px-3 py-2 rounded-xl border border-[#dbeafe] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white font-semibold hover:from-[#0f99ff] hover:to-[#4acbff] shadow-[0_10px_20px_rgba(5,140,255,0.24)]",
  btnOutline: "px-3 py-2 rounded-xl border border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50",
  btnSecondary: "px-3 py-2 rounded-xl border border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50",
  iconBtn: "p-2 rounded-lg border border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50",
  pill: "inline-flex items-center gap-1 rounded-full border border-[#dbeafe] bg-white px-2 py-1 text-xs text-slate-700",
};


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
  // === Auth user z Supabase (id + email) – użyjemy do dopasowania profilu po id ===
const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);

useEffect(() => {
  let cancelled = false;

  (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[app.auth.getSession] error", error);
    }

    if (cancelled) return;
    const u = data.session?.user;
    setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
  })();

  return () => {
    cancelled = true;
  };
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

const [activePage, setActivePage] = useState<'dashboard' | 'matches' | 'my-matches' | 'club' | 'ktpw' | 'demo' | 'admin'>('dashboard');
const [competitionStartCode, setCompetitionStartCode] = useState<CompetitionCode>("EKS");
const [savedRosters, setSavedRosters] = useState<SaveRosterPayload[]>([]);

const handleSaveRoster = React.useCallback((payload: SaveRosterPayload) => {
  const nextPayload: SaveRosterPayload = {
    ...payload,
    updatedAt: payload.updatedAt ?? payload.savedAt,
  };
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
      next[index] = nextPayload;
      return next;
    }

    next.push(nextPayload);
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
const [competitionNameBySeasonId, setCompetitionNameBySeasonId] = useState<Record<string, string>>({});
const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
const [selectedCompetitionSeason, setSelectedCompetitionSeason] = useState<CompetitionSeason | null>(null);
const [, setLoadingCompetitions] = useState(false);
const [, setLoadingCompetitionSeason] = useState(false);

const resolveCompetitionBySelection = React.useCallback((competitionId: string) => {
  if (!competitionId.startsWith("fallback-")) return null;

  const fallback = fallbackCompetitions.find((competition) => competition.id === competitionId);
  if (!fallback) return null;

  const fallbackShort = (fallback.short_name || "").trim().toLowerCase();
  const fallbackName = fallback.name.trim().toLowerCase();

  return (
    competitions.find((competition) => (competition.short_name || "").trim().toLowerCase() === fallbackShort) ||
    competitions.find((competition) => competition.name.trim().toLowerCase() === fallbackName) ||
    null
  );
}, [competitions, fallbackCompetitions]);

const selectedCompetition = React.useMemo(() => {
  if (!selectedCompetitionId) return null;
  return resolveCompetitionBySelection(selectedCompetitionId) ?? null;
}, [resolveCompetitionBySelection, selectedCompetitionId]);

const isEkstraklasaSelected = React.useMemo(() => {
  const shortName = (selectedCompetition?.short_name || "").trim().toLowerCase();
  const name = (selectedCompetition?.name || "").trim().toLowerCase();
  return shortName === "eks" || name === "ekstraklasa";
}, [selectedCompetition?.name, selectedCompetition?.short_name]);

const loadLatestCompetitionSeason = React.useCallback(async (competitionId: string) => {
  const { data, error } = await supabase
    .from("competition_seasons")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const seasons = (data || []) as CompetitionSeason[];
  if (seasons.length === 0) {
    return null;
  }

  const preferred =
    seasons.find((season) => season.status === "active") ||
    seasons.find((season) => season.status === "in_progress") ||
    seasons.find((season) => season.status === "planned") ||
    seasons[0];

  return preferred;
}, []);

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
  } catch (e: any) {
    console.warn('[refreshCompetitions] error', e?.message);
  }
  setLoadingCompetitions(false);
}, []);

useEffect(() => {
  refreshCompetitions();
}, [refreshCompetitions]);

useEffect(() => {
  let cancelled = false;
  const competitionIds = competitions.map((competition) => competition.id);
  if (!competitionIds.length) {
    setCompetitionNameBySeasonId({});
    return;
  }

  void supabase
    .from("competition_seasons")
    .select("id,competition_id")
    .in("competition_id", competitionIds)
    .then(({ data, error }) => {
      if (cancelled || error) return;
      const nameByCompetitionId = Object.fromEntries(competitions.map((competition) => [competition.id, competition.name]));
      setCompetitionNameBySeasonId(Object.fromEntries((data || []).map((season) => [season.id, nameByCompetitionId[season.competition_id] || ""])));
    });

  return () => { cancelled = true; };
}, [competitions]);

useEffect(() => {
  if (!selectedCompetitionId) {
    const fallbackEkstraklasa = fallbackCompetitions.find(c => c.name === 'Ekstraklasa');
    setSelectedCompetitionId(fallbackEkstraklasa?.id ?? fallbackCompetitions[0].id);
  }
}, [selectedCompetitionId, fallbackCompetitions]);

useEffect(() => {
  let cancelled = false;

  const loadSeason = async () => {
    if (!selectedCompetitionId) {
      setSelectedCompetitionSeason(null);
      setLoadingCompetitionSeason(false);
      return;
    }

    setLoadingCompetitionSeason(true);
    setSelectedCompetitionSeason(null);

    try {
      const resolvedCompetition = resolveCompetitionBySelection(selectedCompetitionId);
      if (!resolvedCompetition) {
        if (!cancelled) {
          setSelectedCompetitionSeason(null);
        }
        return;
      }

      const season = await loadLatestCompetitionSeason(resolvedCompetition.id);
      if (!cancelled) {
        setSelectedCompetitionSeason(season);
      }
    } catch (e) {
      console.warn("[selectedCompetitionSeason] error", e);
      if (!cancelled) {
        setSelectedCompetitionSeason(null);
      }
    } finally {
      if (!cancelled) {
        setLoadingCompetitionSeason(false);
      }
    }
  };

  void loadSeason();

  return () => {
    cancelled = true;
  };
}, [loadLatestCompetitionSeason, resolveCompetitionBySelection, selectedCompetitionId]);

  const {
    stages,
    tournaments,
  } = useTournamentManagement({
    selectedCompetitionSeason,
    refreshMatches,
  });
  
  const selectedSeasonStageIds = React.useMemo(() => {
    if (!selectedCompetitionSeason?.id) return new Set<string>();
    return new Set(stages.filter((stage) => stage.competition_season_id === selectedCompetitionSeason.id).map((stage) => stage.id));
  }, [selectedCompetitionSeason?.id, stages]);

  const selectedSeasonTournamentIds = React.useMemo(() => {
    const ids = new Set<string>();
    selectedSeasonStageIds.forEach((stageId) => {
      (tournaments.get(stageId) ?? []).forEach((tournament) => ids.add(tournament.id));
    });
    return ids;
  }, [selectedSeasonStageIds, tournaments]);

  const selectedCategoryMatches = React.useMemo(() => {
    const matches = state.matches.filter((match) => {
      if (selectedCompetitionSeason?.id && match.competitionSeasonId === selectedCompetitionSeason.id) {
        return true;
      }

      if (match.tournamentId && selectedSeasonTournamentIds.has(match.tournamentId)) {
        return true;
      }

      if (isEkstraklasaSelected && !selectedCompetitionSeason?.id && !match.competitionSeasonId && !match.tournamentId) {
        return true;
      }

      return false;
    });

    return matches;
  }, [isEkstraklasaSelected, selectedCompetitionId, selectedCompetitionSeason, selectedSeasonTournamentIds, stages, state.matches, tournaments]);

  // Load profiles (for admin select lists)
  const [profiles,setProfiles]=useState<ProfileRow[]>([])
  const [,setLoadingProfiles]=useState(false)
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
const showKtpwTab = true;
const showDemoTab = !!effectiveUser && (isClub(effectiveUser) || isReferee(effectiveUser) || isDelegate(effectiveUser) || isAdmin(effectiveUser));
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

const competitionNameById = useMemo(
  () => ({
    ...Object.fromEntries((competitions || []).map((competition) => [competition.id, competition.name])),
    ...competitionNameBySeasonId,
  }),
  [competitionNameBySeasonId, competitions]
);

const competitionSeasonNameById = useMemo(() => {
  if (!selectedCompetitionSeason?.id || !selectedCompetitionSeason?.name) {
    return {} as Record<string, string>;
  }

  return {
    [selectedCompetitionSeason.id]: selectedCompetitionSeason.name,
  };
}, [selectedCompetitionSeason?.id, selectedCompetitionSeason?.name]);

const stageNameById = useMemo(
  () => Object.fromEntries((stages || []).map((stage) => [stage.id, stage.name])),
  [stages]
);

const tournamentNameById = useMemo(
  () => Object.fromEntries(Array.from(tournaments.values()).flat().map((tournament) => [tournament.id, tournament.name])),
  [tournaments]
);
const tournamentTypeById = useMemo(
  () => Object.fromEntries(Array.from(tournaments.values()).flat().map((tournament) => [tournament.id, tournament.tournament_type || ""])),
  [tournaments]
);

const allTournaments = useMemo(
  () => Array.from(tournaments.values()).flat(),
  [tournaments]
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

const navPillClass = (isActive: boolean) => clsx(
  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition",
  isActive
    ? "border-[#058CFF] bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white shadow-[0_12px_24px_rgba(5,140,255,0.3)]"
    : "border-sky-100 bg-white/95 text-slate-700 shadow-[0_6px_14px_rgba(2,32,71,0.06)] hover:-translate-y-0.5 hover:border-[#9fd8ff] hover:bg-sky-50 hover:shadow-[0_10px_18px_rgba(5,140,255,0.16)]"
);

  // Load matches from Supabase and merge docs from localStorage
const [,setLoadingMatches]=useState(false)
  
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
    console.error("[matches] raw fetch error", e);
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

 return (
<div className="wp-theme relative min-h-screen w-full max-w-full overflow-hidden bg-[#f6faff] px-3 py-3 sm:px-4 sm:py-4 md:px-8 md:py-6">
  <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.2),transparent_34%),radial-gradient(circle_at_84%_20%,rgba(59,130,246,0.16),transparent_32%),linear-gradient(180deg,#f6faff_0%,#edf6ff_55%,#e9edf2_100%)]" />
  <div className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background-size:180px_90px] [background-image:linear-gradient(120deg,transparent_45%,rgba(44,192,255,0.14)_50%,transparent_56%)]" />
  <div className="pointer-events-none absolute -top-24 -left-20 h-[360px] w-[360px] rounded-full bg-sky-300/20 blur-3xl" />
  <div className="pointer-events-none absolute -right-16 top-40 h-[320px] w-[320px] rounded-full bg-blue-300/15 blur-3xl" />
 <header className="mx-auto mb-5 flex w-full min-w-0 max-w-[1220px] flex-col gap-3 overflow-hidden rounded-3xl border border-[#dbeafe] bg-[radial-gradient(circle_at_14%_45%,rgba(44,192,255,0.18)_0%,rgba(44,192,255,0.06)_20%,rgba(44,192,255,0)_42%),radial-gradient(circle_at_26%_32%,rgba(5,140,255,0.12)_0%,rgba(5,140,255,0)_36%),linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(246,252,255,0.95)_38%,rgba(233,237,242,0.82)_100%)] px-4 py-3 text-[#0A1F44] shadow-[0_10px_24px_rgba(2,32,71,0.08)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:py-5">
  <div className="flex items-center gap-2 sm:min-w-0 sm:flex-1 sm:gap-3">
    <img
      src="/logo.png"
      alt="WPOLO.PL"
      className="block h-[84px] w-auto shrink-0 origin-center object-contain transition-transform duration-[250ms] hover:scale-[1.03] sm:h-[96px] sm:scale-[1.12] sm:hover:scale-[1.16] md:h-[140px] md:scale-[1.2] md:hover:scale-[1.24] lg:h-[178px] lg:scale-[1.3] lg:hover:scale-[1.34]"
    />
    <div className="min-w-0">
      <h1 className="text-[1.55rem] font-extrabold leading-[1.03] text-[#0A1F44] sm:text-[1.95rem]">
        WPOLO.PL
      </h1>
      <p className="mt-1 truncate text-sm font-medium text-[#5F6F8C] sm:text-[14px]">
        Portal dla ludzi w czepku urodzonych
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-[11px] lg:flex-nowrap lg:whitespace-nowrap lg:gap-x-1.5 lg:text-[13px] lg:tracking-[0.04em]">
        <span className="text-[#058CFF]">Rozgrywki</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#9cb6d6]" />
        <span className="text-[#0A1F44]">Wyniki</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#9cb6d6]" />
        <span className="text-[#0A1F44]">Kluby</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#9cb6d6]" />
        <span className="text-[#F5B32E]">Kadra</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#9cb6d6]" />
        <span className="text-[#0A1F44]">Sędziowie</span>
      </div>
    </div>
  </div>

  <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:max-w-[42%] sm:flex-row sm:items-center sm:justify-end">
    
{/* Zalogowany vs. niezalogowany */}
{effectiveUser ? (
  <div className="flex flex-wrap items-center justify-end gap-1.5">
    <Badge tone="blue">
      {prettyRole(effectiveUser.role)}
      {effectiveUser.club ? ` • ${effectiveUser.club}` : ""}
    </Badge>
    <span className="max-w-[40vw] truncate text-sm text-slate-700 sm:max-w-none">
      {effectiveUser.name}
    </span>

    <button onClick={signOut} className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50" title="Wyloguj">
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
          className="w-full whitespace-nowrap rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50 sm:w-auto"
          title="Moderacja artykułów"
        >
          Moderacja
        </button>
        <button
          onClick={() => setPage('approvals')}
          className="w-full whitespace-nowrap rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50 sm:w-auto"
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
      className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50 sm:w-auto"
      onClick={() => setPage('register')}
      title="Załóż konto, by móc komentować artykuły"
    >
      Rejestracja
    </button>
  </div>
)}
  </div>
</header>

<React.Suspense fallback={<main className="mx-auto w-full max-w-[1220px] rounded-3xl border border-[#dbeafe] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Ładowanie wybranej sekcji…</main>}>
<main className="mx-auto grid w-full min-w-0 max-w-[1220px] gap-5">

  {/* === [3.3] HOME: pasek 3 najnowszych newsów + dotychczasowa strona === */}
  {page === 'home' && (
    <>
      <div className="min-w-0 overflow-x-auto rounded-3xl border border-[#dbeafe] bg-[linear-gradient(145deg,rgba(255,255,255,0.97)_0%,rgba(242,250,255,0.95)_100%)] p-3 shadow-[0_10px_24px_rgba(2,32,71,0.06)]">
        <div className="flex w-max min-w-full flex-nowrap gap-2.5 sm:w-auto sm:flex-wrap">
          <button
            className={navPillClass(activePage === 'dashboard')}
            onClick={() => setActivePage('dashboard')}
          >
            <House className="h-4 w-4" />
            Start
          </button>
          <button
            className={navPillClass(activePage === 'matches')}
            onClick={() => setActivePage('matches')}
          >
            <Trophy className="h-4 w-4" />
            Rozgrywki
          </button>
          {showMyMatches && (
            <button
              className={navPillClass(activePage === 'my-matches')}
              onClick={() => setActivePage('my-matches')}
            >
              <CalendarDays className="h-4 w-4" />
              Moje mecze
            </button>
          )}
          {showClubTab && (
            <button
              className={navPillClass(activePage === 'club')}
              onClick={() => setActivePage('club')}
            >
              <Users className="h-4 w-4" />
              Mój klub
            </button>
          )}
          {showKtpwTab && (
            <button
              className={navPillClass(activePage === 'ktpw')}
              onClick={() => setActivePage('ktpw')}
            >
              <FileText className="h-4 w-4" />
              KTPW
            </button>
          )}
          {showDemoTab && (
            <button
              className={navPillClass(activePage === 'demo')}
              onClick={() => setActivePage('demo')}
            >
              <FlaskConical className="h-4 w-4" />
              DEMO
            </button>
          )}
          {showAdminTab && (
            <button
              className={navPillClass(activePage === 'admin')}
              onClick={() => setActivePage('admin')}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          )}
        </div>
      </div>

      {activePage === 'dashboard' && (
        <HomePortalPage
          matches={state.matches}
          tournaments={allTournaments}
          effectiveUser={effectiveUser}
          savedRosters={savedRosters}
          competitionNameById={competitionNameById}
          tournamentNameById={tournamentNameById}
          onOpenMatches={() => { setCompetitionStartCode("EKS"); setActivePage('matches'); }}
          onOpenNationalTeamMatches={() => { setCompetitionStartCode("POL"); setActivePage('matches'); }}
          onOpenArticles={openArticles}
          onOpenArticle={openArticle}
          onOpenKtpw={() => setActivePage('ktpw')}
          onOpenClubPage={showClubTab ? () => setActivePage('club') : undefined}
        />
      )}

      {activePage === 'matches' && (
        <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 rounded-2xl border border-[#dbeafe] bg-[#f7fbff] px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rozgrywki</div>
            <h2 className="mt-1 text-xl font-semibold text-[#061a33]">Centrum meczowe</h2>
          </div>
          <CompetitionsPageV2
            initialCode={competitionStartCode}
            isAdmin={!!effectiveUser && isAdmin(effectiveUser)}
            clubs={clubs}
            refereeNames={refereeNames}
            delegateNames={delegateCandidateNames}
            onMatchesChanged={refreshMatches}
            state={state}
            setState={setState}
            effectiveUser={effectiveUser}
            onPenaltiesChange={refreshPenalties}
          />
        </section>
      )}

      {activePage === 'ktpw' && (
        <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm sm:p-5">
          <Ktpw effectiveUser={effectiveUser} isAdmin={effectiveUser ? isAdmin(effectiveUser) : false} />
        </section>
      )}

      {activePage === 'demo' && effectiveUser && showDemoTab && (
        <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm sm:p-5">
          <DemoPage user={effectiveUser} />
        </section>
      )}

      {activePage === 'admin' && effectiveUser && isAdmin(effectiveUser) && (
        <section className="space-y-4 rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm sm:p-5">
          <AdminPanel
            state={state}
            matches={selectedCategoryMatches}
            setState={setState}
            clubs={clubs}
            refereeNames={refereeNames}
            delegateNames={delegateCandidateNames}
            onAfterChange={() => { refreshMatches(); refreshClubs(); }}
            canWrite={true}
            editingMatchId={editingMatchId}
            clearEditing={() => setEditingMatchId(null)}
            selectedCompetitionSeasonId={selectedCompetitionSeason?.id ?? null}
            selectedCompetitionIsLegacyEks={isEkstraklasaSelected}
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
        </section>
      )}

      {activePage === 'my-matches' && effectiveUser && (isReferee(effectiveUser) || isDelegate(effectiveUser) || isAdmin(effectiveUser)) && (
        <Section title="Moje mecze" icon={<Users className="w-5 h-5" />}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-[#061a33]">Najbliższe mecze</div>
              <div className="space-y-2">
                {myUpcomingMatches.length === 0 ? (
                  <div className="rounded-xl border border-[#dbeafe] bg-white p-3 text-sm text-slate-500">Brak nadchodzących meczów.</div>
                ) : (
                  myUpcomingMatches.map((match) => (
                    <div key={match.id} className="rounded-xl border border-[#dbeafe] bg-white p-3 text-sm shadow-sm">
                      <div className="font-medium">{formatMatchDate(match.date)}{match.time ? ` ${match.time}` : ""}</div>
                      <div className="text-xs text-slate-600">{match.location}</div>
                      <div className="mt-1 font-medium">{match.home} vs {match.away}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        Rola: <span className="font-medium text-slate-700">{getMyMatchRole(effectiveUser, match)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-[#061a33]">Mecze zakończone</div>
              <div className="space-y-2">
                {myFinishedMatches.length === 0 ? (
                  <div className="rounded-xl border border-[#dbeafe] bg-white p-3 text-sm text-slate-500">Brak zakończonych meczów.</div>
                ) : (
                  myFinishedMatches.map((match) => (
                    <div key={match.id} className="rounded-xl border border-[#dbeafe] bg-white p-3 text-sm shadow-sm">
                      <div className="font-medium">{formatMatchDate(match.date)}{match.time ? ` ${match.time}` : ""}</div>
                      <div className="text-xs text-slate-600">{match.location}</div>
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
        <section className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm sm:p-5">
          <ClubDashboard
            effectiveUser={effectiveUser}
            clubId={myProfile?.club_id ?? null}
            matches={state.matches}
            competitionNameById={competitionNameById}
            competitionSeasonNameById={competitionSeasonNameById}
            stageNameById={stageNameById}
            tournamentNameById={tournamentNameById}
            tournamentTypeById={tournamentTypeById}
            penaltiesByMatch={penaltiesByMatch}
            onSaveRoster={handleSaveRoster}
          />
        </section>
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
</React.Suspense>
  </div>)
}


