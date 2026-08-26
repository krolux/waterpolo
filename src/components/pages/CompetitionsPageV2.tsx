import React from "react";
import { CalendarDays, Check, Edit, FileText, MapPin, Plus, RefreshCw, Trash2, UserRoundCheck, X } from "lucide-react";
import { RankingTable } from "../matches/RankingTable";
import { MatchFormV2, blankMatchV2, type MatchDraftV2 } from "../competitions-v2/MatchFormV2";
import { StageFormV2, TournamentFormV2, type StageDraftV2, type TournamentDraftV2 } from "../competitions-v2/StructureFormsV2";
import { COMPETITION_CODES, COMPETITION_LABELS, createPolishNationalTeamCompetition, loadCompetitionContextV2, type CompetitionCode, type CompetitionContextV2 } from "../../lib/competitionsV2";
import { createMatch, deleteMatch, updateMatch } from "../../lib/matches";
import { addStage, addTournament, addTournamentClub, deleteStage, deleteTournament } from "../../lib/competitions";
import { setMyAvailability } from "../../lib/availability";
import { AdminAvailableReferees } from "../matches/AdminAvailableReferees";
import { PerMatchActions } from "../matches/PerMatchActions";
import { MatchDocuments } from "../matches/MatchDocuments";
import { CompetitionAdminsPanel } from "../competitions-v2/CompetitionAdminsPanel";
import { getMyCompetitionPermissions, type CompetitionPermission } from "../../lib/competitionPermissions";
import type { AppState, Role } from "../../types/wpolo";
import { MatchProtocolWorkspace } from "../matches/MatchProtocolWorkspace";

type Props = {
  initialCode: CompetitionCode;
  isAdmin: boolean;
  clubs: string[];
  refereeNames: string[];
  delegateNames: string[];
  onMatchesChanged: () => Promise<void> | void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  effectiveUser: { name: string; role: Role; club?: string } | null;
  onPenaltiesChange: () => void;
};

const emptyContext: CompetitionContextV2 = { competition: null, season: null, stages: [], tournaments: [], tournamentClubs: [], matches: [] };
const stageBlank = (): StageDraftV2 => ({ name: "", type: "round_robin", startDate: "", endDate: "" });
const tournamentBlank = (): TournamentDraftV2 => ({ stageId: "", name: "", type: "league", startDate: "", endDate: "", clubs: [] });

export function CompetitionsPageV2({ initialCode, isAdmin, clubs, refereeNames, delegateNames, onMatchesChanged, state, setState, effectiveUser, onPenaltiesChange }: Props) {
  const [code, setCode] = React.useState<CompetitionCode>(initialCode);
  const [context, setContext] = React.useState<CompetitionContextV2>(emptyContext);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<"match" | "stage" | "tournament" | null>(null);
  const [matchDraft, setMatchDraft] = React.useState<MatchDraftV2>(blankMatchV2);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [stageDraft, setStageDraft] = React.useState<StageDraftV2>(stageBlank);
  const [tournamentDraft, setTournamentDraft] = React.useState<TournamentDraftV2>(tournamentBlank);
  const [openActionsId, setOpenActionsId] = React.useState<string | null>(null);
  const [creatingNationalTeam, setCreatingNationalTeam] = React.useState(false);
  const [delegatedPermissions, setDelegatedPermissions] = React.useState<Set<CompetitionPermission>>(new Set());
  const [protocolMatchId, setProtocolMatchId] = React.useState<string | null>(null);
  const privateProtocolEnabled = import.meta.env.DEV && isAdmin;
  const formRef = React.useRef<HTMLDivElement>(null);

  const reload = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setContext(await loadCompetitionContextV2(code)); }
    catch (e) { setContext(emptyContext); setError(e instanceof Error ? e.message : "Nie udało się pobrać danych rozgrywek."); }
    finally { setLoading(false); }
  }, [code]);

  React.useEffect(() => { void reload(); }, [reload]);
  React.useEffect(() => { setCode(initialCode); }, [initialCode]);
  React.useEffect(() => { if (form) requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })); }, [form, editingId]);
  React.useEffect(() => {
    if (!context.competition?.id || isAdmin) { setDelegatedPermissions(new Set()); return; }
    getMyCompetitionPermissions(context.competition.id).then(setDelegatedPermissions).catch(() => setDelegatedPermissions(new Set()));
  }, [context.competition?.id, isAdmin]);

  const can = React.useCallback((permission: CompetitionPermission) => isAdmin || delegatedPermissions.has(permission), [delegatedPermissions, isAdmin]);

  const tournamentById = React.useMemo(() => new Map(context.tournaments.map(t => [t.id, t])), [context.tournaments]);
  const stageById = React.useMemo(() => new Map(context.stages.map(s => [s.id, s])), [context.stages]);
  const matchClubs = React.useMemo(() => Array.from(new Set(context.matches.flatMap(m => [m.home, m.away]).filter(Boolean))), [context.matches]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = context.matches.filter(m => m.date >= today && (!m.result || !m.result.trim())).sort((a, b) => a.date.localeCompare(b.date) || Number(a.round || 0) - Number(b.round || 0));
  const finished = context.matches.filter(m => !!m.result?.trim()).sort((a, b) => b.date.localeCompare(a.date));
  const formClubs = React.useMemo(() => {
    const tournamentClubs = matchDraft.tournamentId
      ? context.tournamentClubs.filter(c => c.tournament_id === matchDraft.tournamentId).map(c => c.club_name)
      : [];
    const available = tournamentClubs.length ? tournamentClubs : clubs;
    return Array.from(new Set([...available, matchDraft.home, matchDraft.away].filter(Boolean)));
  }, [clubs, context.tournamentClubs, matchDraft.away, matchDraft.home, matchDraft.tournamentId]);
  const isUserReferee = !!effectiveUser && String(effectiveUser.role).split(/[-+,\s]+/).includes("Referee");

  const openNew = (kind: "match" | "stage" | "tournament") => { setEditingId(null); setForm(kind); };
  const createNationalTeamCategory = async () => {
    setCreatingNationalTeam(true);
    try {
      await createPolishNationalTeamCompetition();
      await reload();
    } catch (e) {
      alert("Nie udało się utworzyć kategorii Reprezentacja Polski: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCreatingNationalTeam(false);
    }
  };
  const cancel = () => { setForm(null); setEditingId(null); setMatchDraft(blankMatchV2()); setStageDraft(stageBlank()); setTournamentDraft(tournamentBlank()); };

  const saveMatch = async () => {
    if (!context.season) return alert("Ta kategoria nie ma aktywnego sezonu. Nie można dodać meczu.");
    if (!matchDraft.date || !matchDraft.location.trim() || !matchDraft.home || !matchDraft.away) return alert("Uzupełnij datę, miejsce i drużyny.");
    if (matchDraft.home === matchDraft.away) return alert("Gospodarz i goście muszą być różni.");
    try {
      if (editingId) {
        if (!can("matches") && !can("officials")) return alert("Brak uprawnień do edycji tego meczu.");
        // Relacje są celowo pominięte: edycja pól meczu nie może ich wyzerować.
        const { tournamentId: _ignored, ...ordinaryFields } = matchDraft;
        await updateMatch(editingId, can("matches") ? ordinaryFields : { referee1: matchDraft.referee1 || null, referee2: matchDraft.referee2 || null, delegate: matchDraft.delegate || null });
      } else {
        if (!can("matches")) return alert("Brak uprawnień do dodawania meczów.");
        const tournament = matchDraft.tournamentId ? tournamentById.get(matchDraft.tournamentId) : null;
        await createMatch({ ...matchDraft, tournamentId: tournament?.id || null, stageId: tournament?.stage_id || null, competitionSeasonId: context.season.id } as never);
      }
      cancel(); await reload(); await onMatchesChanged();
    } catch (e) { alert("Błąd zapisu meczu: " + (e instanceof Error ? e.message : String(e))); }
  };

  const edit = (id: string) => {
    const m = context.matches.find(item => item.id === id); if (!m) return;
    setEditingId(id); setMatchDraft({ date: m.date, time: m.time || "", round: m.round || "", series_round: m.series_round || "", location: m.location, home: m.home, away: m.away, result: m.result || "", referee1: m.referee1 || "", referee2: m.referee2 || "", delegate: m.delegate || "", notes: m.notes || "", stream_url: m.stream_url || "", tournamentId: m.tournamentId || "" }); setForm("match");
  };

  const removeMatch = async (id: string) => { if (!can("delete")) return alert("Brak uprawnień do usuwania."); if (!confirm("Usunąć ten mecz?")) return; try { await deleteMatch(id); await reload(); await onMatchesChanged(); } catch (e) { alert(String(e)); } };
  const saveStage = async () => { if (!can("stages")) return alert("Brak uprawnień do etapów."); if (!context.season || !stageDraft.name.trim()) return alert("Podaj nazwę etapu."); try { await addStage(context.season.id, stageDraft.name.trim(), stageDraft.type, stageDraft.startDate, stageDraft.endDate); cancel(); await reload(); } catch (e) { alert(String(e)); } };
  const saveTournament = async () => { if (!can("tournaments")) return alert("Brak uprawnień do turniejów."); if (!tournamentDraft.stageId || !tournamentDraft.name.trim()) return alert("Wybierz etap i podaj nazwę turnieju."); try { const t = await addTournament(tournamentDraft.stageId, tournamentDraft.name.trim(), tournamentDraft.type, tournamentDraft.startDate, tournamentDraft.endDate); await Promise.all(tournamentDraft.clubs.map(club => addTournamentClub(t.id, club))); cancel(); await reload(); } catch (e) { alert(String(e)); } };
  const removeStage = async (id: string) => { if (!can("delete")) return alert("Brak uprawnień do usuwania."); if (!confirm("Usunąć etap wraz z jego strukturą?")) return; try { await deleteStage(id); await reload(); } catch (e) { alert(String(e)); } };
  const removeTournament = async (id: string) => { if (!can("delete")) return alert("Brak uprawnień do usuwania."); if (!confirm("Usunąć turniej?")) return; try { await deleteTournament(id); await reload(); } catch (e) { alert(String(e)); } };

  const renderMobileRows = (items: typeof context.matches) => (
    <div className="space-y-3 p-3 md:hidden">
      {items.map(m => {
        const actionMatch = state.matches.find(item => item.id === m.id);
        return <article key={m.id} className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="p-3">
            <div className="text-[15px] font-semibold leading-snug text-[#061a33]">{m.home} <span className="text-sky-600">–</span> {m.away}</div>
            <div className="mt-3 grid grid-cols-[18px_1fr] gap-x-2 gap-y-2 text-xs leading-snug text-slate-600">
              <CalendarDays className="h-4 w-4 text-sky-500" /><span>{m.date}{m.time ? `, godz. ${m.time}` : " • godzina do potwierdzenia"}</span>
              <MapPin className="h-4 w-4 text-sky-500" /><span>{m.location || "Miejsce do potwierdzenia"}</span>
              <UserRoundCheck className="h-4 w-4 text-sky-500" /><span>Sędziowie: {[m.referee1, m.referee2].filter(Boolean).join(", ") || "do wyznaczenia"}{m.delegate ? ` • Delegat: ${m.delegate}` : ""}</span>
            </div>
            {m.result ? <div className="mt-3 inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-800">Wynik: {m.result}</div> : null}
            {(isUserReferee || isAdmin || (effectiveUser && actionMatch)) && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sky-50 pt-3">
              {isUserReferee && <>
                <span className="mr-1 text-xs text-slate-500">Dostępność:</span>
                <button aria-label={`Dostępny na ${m.home} – ${m.away}`} onClick={async () => { try { await setMyAvailability(m.id, true); setState(old => ({ ...old, matches: old.matches.map(item => item.id === m.id ? { ...item, myAvailable: true, myAvailabilitySet: true } : item) })); } catch (e) { alert("Błąd zapisu dostępności: " + (e instanceof Error ? e.message : String(e))); } }} className={`rounded-lg border p-1.5 ${actionMatch?.myAvailabilitySet && actionMatch.myAvailable ? "border-green-300 bg-green-50 text-green-700" : "text-slate-500"}`}><Check className="h-4 w-4" /></button>
                <button aria-label={`Niedostępny na ${m.home} – ${m.away}`} onClick={async () => { try { await setMyAvailability(m.id, false); setState(old => ({ ...old, matches: old.matches.map(item => item.id === m.id ? { ...item, myAvailable: false, myAvailabilitySet: true } : item) })); } catch (e) { alert("Błąd zapisu dostępności: " + (e instanceof Error ? e.message : String(e))); } }} className={`rounded-lg border p-1.5 ${actionMatch?.myAvailabilitySet && !actionMatch.myAvailable ? "border-red-300 bg-red-50 text-red-700" : "text-slate-500"}`}><X className="h-4 w-4" /></button>
              </>}
              {(can("matches") || can("officials")) && <>
                <button aria-label={`Edytuj ${m.home} – ${m.away}`} onClick={() => edit(m.id)} className="rounded-lg border p-1.5"><Edit className="h-4 w-4" /></button>
                {can("delete") && <button aria-label={`Usuń ${m.home} – ${m.away}`} onClick={() => void removeMatch(m.id)} className="rounded-lg border p-1.5 text-red-600"><Trash2 className="h-4 w-4" /></button>}
              </>}
              {effectiveUser && actionMatch && <button onClick={() => setOpenActionsId(current => current === m.id ? null : m.id)} className="rounded-lg border px-2.5 py-1.5 text-xs font-medium text-[#08284a]">{openActionsId === m.id ? "Ukryj akcje" : "Akcje meczu"}</button>}
              {privateProtocolEnabled && actionMatch && <button onClick={() => setProtocolMatchId(m.id)} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800"><FileText className="h-3.5 w-3.5" />Protokół</button>}
            </div>}
          </div>
          {isAdmin && <div className="border-t border-sky-50 px-3 py-2"><AdminAvailableReferees matchId={m.id} /></div>}
          {editingId === m.id && form === "match" && <div ref={formRef} className="border-t border-sky-100 bg-sky-50/50 p-3"><MatchFormV2 draft={matchDraft} setDraft={setMatchDraft} tournaments={context.tournaments} clubs={formClubs} refereeNames={refereeNames} delegateNames={delegateNames} editing onSave={() => void saveMatch()} onHide={cancel} onCancel={cancel} /></div>}
          {openActionsId === m.id && effectiveUser && actionMatch && <div className="border-t border-sky-100 bg-slate-50 p-3"><PerMatchActions state={state} setState={setState} user={effectiveUser} onPenaltiesChange={onPenaltiesChange} fixedMatch={actionMatch} /></div>}
          {effectiveUser && actionMatch && <div className="px-3 pb-3"><MatchDocuments match={actionMatch} effectiveUser={effectiveUser} /></div>}
        </article>;
      })}
    </div>
  );

  const renderRows = (items: typeof context.matches) => items.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Data</th><th className="p-2">Mecz</th><th className="p-2">Wynik</th><th className="p-2">Miejsce</th><th className="p-2">Obsada</th>{isUserReferee && <th className="p-2 text-center">Moja dostępność</th>}{isAdmin && <th className="p-2">Dostępni sędziowie</th>}{effectiveUser && <th className="p-2">Akcje</th>}</tr></thead><tbody>{items.map(m => {
    const actionMatch = state.matches.find(item => item.id === m.id);
      const colSpan = 5 + (isUserReferee ? 1 : 0) + (isAdmin ? 1 : 0) + (effectiveUser ? 1 : 0);
    return <React.Fragment key={m.id}><tr className="border-b align-top"><td className="p-2 whitespace-nowrap">{m.date}{m.time ? ` ${m.time}` : ""}</td><td className="p-2 font-medium">{m.home} – {m.away}</td><td className="p-2">{m.result || "—"}</td><td className="p-2">{m.location}</td><td className="p-2"><div className="space-y-0.5 text-xs"><div><span className="text-slate-500">Sędziowie:</span> {[m.referee1, m.referee2].filter(Boolean).join(", ") || "—"}</div><div><span className="text-slate-500">Delegat:</span> {m.delegate || "—"}</div></div></td>{isUserReferee && <td className="p-2"><div className="flex justify-center gap-1"><button aria-label={`Dostępny na ${m.home} – ${m.away}`} title="Jestem dostępny" onClick={async () => { try { await setMyAvailability(m.id, true); setState(old => ({ ...old, matches: old.matches.map(item => item.id === m.id ? { ...item, myAvailable: true, myAvailabilitySet: true } : item) })); } catch (e) { alert("Błąd zapisu dostępności: " + (e instanceof Error ? e.message : String(e))); } }} className={`rounded-lg border p-1.5 ${actionMatch?.myAvailabilitySet && actionMatch.myAvailable ? "border-green-300 bg-green-50 text-green-700" : "text-slate-500"}`}><Check className="h-4 w-4" /></button><button aria-label={`Niedostępny na ${m.home} – ${m.away}`} title="Nie mogę" onClick={async () => { try { await setMyAvailability(m.id, false); setState(old => ({ ...old, matches: old.matches.map(item => item.id === m.id ? { ...item, myAvailable: false, myAvailabilitySet: true } : item) })); } catch (e) { alert("Błąd zapisu dostępności: " + (e instanceof Error ? e.message : String(e))); } }} className={`rounded-lg border p-1.5 ${actionMatch?.myAvailabilitySet && !actionMatch.myAvailable ? "border-red-300 bg-red-50 text-red-700" : "text-slate-500"}`}><X className="h-4 w-4" /></button></div></td>}{isAdmin && <td className="p-2"><AdminAvailableReferees matchId={m.id} /></td>}{effectiveUser && <td className="p-2"><div className="flex flex-wrap gap-1">{isAdmin && <><button aria-label={`Edytuj ${m.home} – ${m.away}`} onClick={() => edit(m.id)} className="rounded-lg border p-1.5"><Edit className="h-4 w-4" /></button><button aria-label={`Usuń ${m.home} – ${m.away}`} onClick={() => void removeMatch(m.id)} className="rounded-lg border p-1.5 text-red-600"><Trash2 className="h-4 w-4" /></button></>}{actionMatch && <button onClick={() => setOpenActionsId(current => current === m.id ? null : m.id)} className="rounded-lg border px-2 py-1 text-xs font-medium text-[#08284a]">{openActionsId === m.id ? "Ukryj" : "Akcje"}</button>}{privateProtocolEnabled && actionMatch && <button onClick={() => setProtocolMatchId(m.id)} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"><FileText className="h-3.5 w-3.5" />Protokół</button>}</div></td>}</tr>{effectiveUser && actionMatch && <tr><td colSpan={colSpan} className="px-3 pb-2"><MatchDocuments match={actionMatch} effectiveUser={effectiveUser} /></td></tr>}{editingId === m.id && form === "match" && <tr><td colSpan={colSpan} className="bg-sky-50/50 p-3"><div ref={formRef}><MatchFormV2 draft={matchDraft} setDraft={setMatchDraft} tournaments={context.tournaments} clubs={formClubs} refereeNames={refereeNames} delegateNames={delegateNames} editing onSave={() => void saveMatch()} onHide={cancel} onCancel={cancel} /></div></td></tr>}{openActionsId === m.id && effectiveUser && actionMatch && <tr><td colSpan={colSpan} className="bg-slate-50 p-3"><PerMatchActions state={state} setState={setState} user={effectiveUser} onPenaltiesChange={onPenaltiesChange} fixedMatch={actionMatch} /></td></tr>}</React.Fragment>;
  })}</tbody></table></div>{renderMobileRows(items)}</> : <p className="p-3 text-sm text-slate-500">Brak meczów.</p>;

  const renderGroupedMatches = (items: typeof context.matches) => {
    if (!items.length) return <p className="p-3 text-sm text-slate-500">Brak meczów.</p>;
    const groups = Array.from(items.reduce((map, match) => {
      const key = match.series_round || "—";
      const group = map.get(key) || [];
      group.push(match); map.set(key, group); return map;
    }, new Map<string, typeof context.matches>()));
    return <div className="space-y-3 p-3">{groups.map(([round, matches]) => <section key={round} className="overflow-hidden rounded-xl border border-sky-100 bg-white"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 bg-sky-50 px-3 py-2"><h4 className="font-semibold text-[#061a33]">Kolejka {round}</h4><span className="text-xs text-slate-500">{Array.from(new Set(matches.map(m => m.date))).join(" · ")}</span></div>{renderRows(matches)}</section>)}</div>;
  };

  const protocolMatch = protocolMatchId ? state.matches.find(match => match.id === protocolMatchId) : null;
  return <div className="min-w-0 space-y-4">
    <div className="-mx-1 overflow-x-auto px-1 pb-1"><div className="flex w-max gap-2">{COMPETITION_CODES.map(item => {
      const nationalTeam = item === "POL";
      const buttonClass = nationalTeam
        ? `rounded-xl border px-4 py-2 font-semibold text-white transition ${code === item ? "border-red-700 bg-gradient-to-r from-red-700 to-red-500 shadow-[0_8px_18px_rgba(185,28,28,0.3)]" : "border-red-500 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"}`
        : `rounded-xl border px-4 py-2 font-semibold ${code === item ? "border-sky-500 bg-sky-500 text-white" : "border-sky-100 bg-white"}`;
      return <button key={item} onClick={() => setCode(item)} className={buttonClass}>{COMPETITION_LABELS[item]}</button>;
    })}</div></div>
    <div className="flex items-center justify-between rounded-2xl bg-[#f7fbff] p-4"><div><div className="text-xs uppercase tracking-wider text-slate-500">{context.season?.name || "Rozgrywki"}</div><h2 className="text-xl font-semibold text-[#061a33]">{context.competition?.name || COMPETITION_LABELS[code]}</h2></div><button onClick={() => void reload()} aria-label="Odśwież"><RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} /></button></div>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Nie udało się odczytać struktury rozgrywek: {error}</div>}
    {!loading && !error && code === "POL" && !context.competition && isAdmin && (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="font-semibold text-[#061a33]">Przygotuj kalendarz reprezentacji</div>
        <p className="mt-1 text-sm text-slate-600">Utwórz kategorię i aktywny sezon, aby móc dodawać mecze reprezentacji Polski.</p>
        <button disabled={creatingNationalTeam} onClick={() => void createNationalTeamCategory()} className="mt-3 rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {creatingNationalTeam ? "Tworzenie…" : "Utwórz kategorię Reprezentacja Polski"}
        </button>
      </div>
    )}
    {!loading && !error && !context.season && <div className="rounded-xl bg-slate-50 p-4">{code === "POL" ? "Kalendarz reprezentacji Polski jest przygotowywany." : "Brak aktywnego sezonu dla tej kategorii."}</div>}
    {(can("matches") || can("stages") || can("tournaments")) && <div className="-mx-1 flex overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">{can("matches") && <button className="shrink-0 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-2 font-semibold text-white" onClick={() => openNew("match")}><Plus className="mr-1 inline h-4 w-4" />Dodaj mecz</button>}{can("stages") && <button className="shrink-0 whitespace-nowrap rounded-xl border px-3 py-2" onClick={() => openNew("stage")}><Plus className="mr-1 inline h-4 w-4" />Dodaj etap</button>}{can("tournaments") && <button className="shrink-0 whitespace-nowrap rounded-xl border px-3 py-2" onClick={() => openNew("tournament")}><Plus className="mr-1 inline h-4 w-4" />Dodaj turniej</button>}</div>}
    {isAdmin && context.competition?.id && <CompetitionAdminsPanel competitionId={context.competition.id} />}
    {!isAdmin && (can("matches") || can("officials") || can("delete")) && context.matches.length > 0 && (
      <div className="rounded-2xl border border-sky-100 bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-[#061a33]">Zarządzanie meczami tej kategorii</div>
        <div className="flex flex-wrap gap-2">{context.matches.map(match => <div key={match.id} className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-xs"><span className="font-medium">{match.date}: {match.home} – {match.away}</span>{(can("matches") || can("officials")) && <button type="button" onClick={() => edit(match.id)} className="rounded-lg border bg-white px-2 py-1">{can("matches") ? "Edytuj" : "Ustaw obsadę"}</button>}{can("delete") && <button type="button" onClick={() => void removeMatch(match.id)} className="rounded-lg border bg-white px-2 py-1 text-red-600">Usuń</button>}</div>)}</div>
      </div>
    )}
    <div ref={!editingId ? formRef : undefined}>{form === "match" && !editingId && <MatchFormV2 draft={matchDraft} setDraft={setMatchDraft} tournaments={context.tournaments} clubs={formClubs} refereeNames={refereeNames} delegateNames={delegateNames} editing={false} onSave={() => void saveMatch()} onHide={cancel} onCancel={cancel} />}{form === "stage" && <StageFormV2 value={stageDraft} setValue={setStageDraft} onSave={() => void saveStage()} onHide={() => setForm(null)} onCancel={cancel} />}{form === "tournament" && <TournamentFormV2 value={tournamentDraft} setValue={setTournamentDraft} stages={context.stages} allClubs={clubs} onSave={() => void saveTournament()} onHide={() => setForm(null)} onCancel={cancel} />}</div>
    {!loading && context.matches.length === 0 && <div className="rounded-2xl border border-sky-100 bg-white p-5 text-slate-600">Brak meczów w tej kategorii.</div>}
    {context.matches.length > 0 && <section className="rounded-2xl border border-sky-100 bg-white"><div className="border-b p-3"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">Najbliższe terminy</div><h3 className="mt-1 text-lg font-semibold text-[#061a33]">Nadchodzące mecze</h3></div>{renderGroupedMatches(upcoming)}</section>}
    {context.matches.length > 0 && <RankingTable matches={context.matches} clubs={matchClubs} />}
    {isAdmin && context.stages.map(stage => <section key={stage.id} className="rounded-2xl border border-sky-100 bg-white p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">{stage.name}</h3><span className="text-xs text-slate-500">{stage.stage_type}</span></div><button aria-label={`Usuń etap ${stage.name}`} onClick={() => void removeStage(stage.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div>{context.tournaments.filter(t => t.stage_id === stage.id).map(t => <div key={t.id} className="mb-3 rounded-xl bg-slate-50 p-3"><div className="flex justify-between"><div><b>{t.name}</b><div className="text-xs text-slate-500">{t.tournament_type} · {context.tournamentClubs.filter(c => c.tournament_id === t.id).map(c => c.club_name).join(", ") || "bez przypisanych klubów"}</div></div><button aria-label={`Usuń turniej ${t.name}`} onClick={() => void removeTournament(t.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>)}</section>)}
    {finished.length > 0 && <section className="rounded-2xl border border-sky-100 bg-white"><h3 className="border-b p-3 font-semibold">Zakończone mecze</h3>{renderGroupedMatches(finished)}</section>}
    <div className="text-xs text-slate-400">Stan na {today}. Rozgrywki V2.</div>
    {privateProtocolEnabled && protocolMatch && effectiveUser ? <MatchProtocolWorkspace match={protocolMatch} user={effectiveUser} onClose={() => setProtocolMatchId(null)} /> : null}
  </div>;
}
