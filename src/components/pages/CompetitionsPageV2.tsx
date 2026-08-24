import React from "react";
import { Edit, Plus, RefreshCw, Trash2 } from "lucide-react";
import { RankingTable } from "../matches/RankingTable";
import { MatchFormV2, blankMatchV2, type MatchDraftV2 } from "../competitions-v2/MatchFormV2";
import { StageFormV2, TournamentFormV2, type StageDraftV2, type TournamentDraftV2 } from "../competitions-v2/StructureFormsV2";
import { COMPETITION_CODES, loadCompetitionContextV2, type CompetitionCode, type CompetitionContextV2 } from "../../lib/competitionsV2";
import { createMatch, deleteMatch, updateMatch } from "../../lib/matches";
import { addStage, addTournament, addTournamentClub, deleteStage, deleteTournament } from "../../lib/competitions";

type Props = {
  isAdmin: boolean;
  clubs: string[];
  refereeNames: string[];
  delegateNames: string[];
  onMatchesChanged: () => Promise<void> | void;
};

const emptyContext: CompetitionContextV2 = { competition: null, season: null, stages: [], tournaments: [], tournamentClubs: [], matches: [] };
const stageBlank = (): StageDraftV2 => ({ name: "", type: "round_robin", startDate: "", endDate: "" });
const tournamentBlank = (): TournamentDraftV2 => ({ stageId: "", name: "", type: "league", startDate: "", endDate: "", clubs: [] });

export function CompetitionsPageV2({ isAdmin, clubs, refereeNames, delegateNames, onMatchesChanged }: Props) {
  const [code, setCode] = React.useState<CompetitionCode>("EKS");
  const [context, setContext] = React.useState<CompetitionContextV2>(emptyContext);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<"match" | "stage" | "tournament" | null>(null);
  const [matchDraft, setMatchDraft] = React.useState<MatchDraftV2>(blankMatchV2);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [stageDraft, setStageDraft] = React.useState<StageDraftV2>(stageBlank);
  const [tournamentDraft, setTournamentDraft] = React.useState<TournamentDraftV2>(tournamentBlank);
  const formRef = React.useRef<HTMLDivElement>(null);

  const reload = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setContext(await loadCompetitionContextV2(code)); }
    catch (e) { setContext(emptyContext); setError(e instanceof Error ? e.message : "Nie udało się pobrać danych rozgrywek."); }
    finally { setLoading(false); }
  }, [code]);

  React.useEffect(() => { void reload(); }, [reload]);
  React.useEffect(() => { if (form) requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [form]);

  const tournamentById = React.useMemo(() => new Map(context.tournaments.map(t => [t.id, t])), [context.tournaments]);
  const stageById = React.useMemo(() => new Map(context.stages.map(s => [s.id, s])), [context.stages]);
  const matchClubs = React.useMemo(() => Array.from(new Set(context.matches.flatMap(m => [m.home, m.away]).filter(Boolean))), [context.matches]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = context.matches.filter(m => !m.result || !m.result.trim()).sort((a, b) => a.date.localeCompare(b.date));
  const finished = context.matches.filter(m => !!m.result?.trim()).sort((a, b) => b.date.localeCompare(a.date));

  const openNew = (kind: "match" | "stage" | "tournament") => { setEditingId(null); setForm(kind); };
  const cancel = () => { setForm(null); setEditingId(null); setMatchDraft(blankMatchV2()); setStageDraft(stageBlank()); setTournamentDraft(tournamentBlank()); };

  const saveMatch = async () => {
    if (!context.season) return alert("Ta kategoria nie ma aktywnego sezonu. Nie można dodać meczu.");
    if (!matchDraft.date || !matchDraft.location.trim() || !matchDraft.home || !matchDraft.away) return alert("Uzupełnij datę, miejsce i drużyny.");
    if (matchDraft.home === matchDraft.away) return alert("Gospodarz i goście muszą być różni.");
    try {
      if (editingId) {
        // Relacje są celowo pominięte: edycja pól meczu nie może ich wyzerować.
        const { tournamentId: _ignored, ...ordinaryFields } = matchDraft;
        await updateMatch(editingId, ordinaryFields);
      } else {
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

  const removeMatch = async (id: string) => { if (!confirm("Usunąć ten mecz?")) return; try { await deleteMatch(id); await reload(); await onMatchesChanged(); } catch (e) { alert(String(e)); } };
  const saveStage = async () => { if (!context.season || !stageDraft.name.trim()) return alert("Podaj nazwę etapu."); try { await addStage(context.season.id, stageDraft.name.trim(), stageDraft.type, stageDraft.startDate, stageDraft.endDate); cancel(); await reload(); } catch (e) { alert(String(e)); } };
  const saveTournament = async () => { if (!tournamentDraft.stageId || !tournamentDraft.name.trim()) return alert("Wybierz etap i podaj nazwę turnieju."); try { const t = await addTournament(tournamentDraft.stageId, tournamentDraft.name.trim(), tournamentDraft.type, tournamentDraft.startDate, tournamentDraft.endDate); await Promise.all(tournamentDraft.clubs.map(club => addTournamentClub(t.id, club))); cancel(); await reload(); } catch (e) { alert(String(e)); } };
  const removeStage = async (id: string) => { if (!confirm("Usunąć etap wraz z jego strukturą?")) return; try { await deleteStage(id); await reload(); } catch (e) { alert(String(e)); } };
  const removeTournament = async (id: string) => { if (!confirm("Usunąć turniej?")) return; try { await deleteTournament(id); await reload(); } catch (e) { alert(String(e)); } };

  const renderRows = (items: typeof context.matches) => items.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Data</th><th className="p-2">Mecz</th><th className="p-2">Wynik</th><th className="p-2">Miejsce</th>{isAdmin && <th className="p-2">Akcje</th>}</tr></thead><tbody>{items.map(m => <tr key={m.id} className="border-b"><td className="p-2 whitespace-nowrap">{m.date}{m.time ? ` ${m.time}` : ""}</td><td className="p-2 font-medium">{m.home} – {m.away}</td><td className="p-2">{m.result || "—"}</td><td className="p-2">{m.location}</td>{isAdmin && <td className="p-2"><div className="flex gap-1"><button aria-label="Edytuj" onClick={() => edit(m.id)} className="rounded-lg border p-1.5"><Edit className="h-4 w-4" /></button><button aria-label="Usuń" onClick={() => void removeMatch(m.id)} className="rounded-lg border p-1.5 text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>}</tr>)}</tbody></table></div> : <p className="p-3 text-sm text-slate-500">Brak meczów.</p>;

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">{COMPETITION_CODES.map(item => <button key={item} onClick={() => setCode(item)} className={`rounded-xl border px-4 py-2 font-semibold ${code === item ? "border-sky-500 bg-sky-500 text-white" : "border-sky-100 bg-white"}`}>{item}</button>)}</div>
    <div className="flex items-center justify-between rounded-2xl bg-[#f7fbff] p-4"><div><div className="text-xs uppercase tracking-wider text-slate-500">{context.season?.name || "Rozgrywki"}</div><h2 className="text-xl font-semibold text-[#061a33]">{context.competition?.name || code}</h2></div><button onClick={() => void reload()} aria-label="Odśwież"><RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} /></button></div>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Nie udało się odczytać struktury rozgrywek: {error}</div>}
    {!loading && !error && !context.season && <div className="rounded-xl bg-slate-50 p-4">Brak aktywnego sezonu dla tej kategorii.</div>}
    {isAdmin && <div className="flex flex-wrap gap-2"><button className="rounded-xl bg-sky-500 px-3 py-2 font-semibold text-white" onClick={() => openNew("match")}><Plus className="mr-1 inline h-4 w-4" />Dodaj mecz</button><button className="rounded-xl border px-3 py-2" onClick={() => openNew("stage")}><Plus className="mr-1 inline h-4 w-4" />Dodaj etap</button><button className="rounded-xl border px-3 py-2" onClick={() => openNew("tournament")}><Plus className="mr-1 inline h-4 w-4" />Dodaj turniej</button></div>}
    <div ref={formRef}>{form === "match" && <MatchFormV2 draft={matchDraft} setDraft={setMatchDraft} tournaments={context.tournaments} clubs={matchDraft.tournamentId ? context.tournamentClubs.filter(c => c.tournament_id === matchDraft.tournamentId).map(c => c.club_name) : clubs} refereeNames={refereeNames} delegateNames={delegateNames} editing={!!editingId} onSave={() => void saveMatch()} onHide={() => setForm(null)} onCancel={cancel} />}{form === "stage" && <StageFormV2 value={stageDraft} setValue={setStageDraft} onSave={() => void saveStage()} onHide={() => setForm(null)} onCancel={cancel} />}{form === "tournament" && <TournamentFormV2 value={tournamentDraft} setValue={setTournamentDraft} stages={context.stages} allClubs={clubs} onSave={() => void saveTournament()} onHide={() => setForm(null)} onCancel={cancel} />}</div>
    {!loading && context.matches.length === 0 && <div className="rounded-2xl border border-sky-100 bg-white p-5 text-slate-600">Brak meczów w tej kategorii.</div>}
    {context.matches.length > 0 && <RankingTable matches={context.matches} clubs={matchClubs} />}
    {context.stages.map(stage => <section key={stage.id} className="rounded-2xl border border-sky-100 bg-white p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">{stage.name}</h3><span className="text-xs text-slate-500">{stage.stage_type}</span></div>{isAdmin && <button onClick={() => void removeStage(stage.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>{context.tournaments.filter(t => t.stage_id === stage.id).map(t => <div key={t.id} className="mb-3 rounded-xl bg-slate-50 p-3"><div className="mb-2 flex justify-between"><div><b>{t.name}</b><div className="text-xs text-slate-500">{t.tournament_type} · {context.tournamentClubs.filter(c => c.tournament_id === t.id).map(c => c.club_name).join(", ") || "bez przypisanych klubów"}</div></div>{isAdmin && <button onClick={() => void removeTournament(t.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>{renderRows(context.matches.filter(m => m.tournamentId === t.id))}</div>)}</section>)}
    <section className="rounded-2xl border border-sky-100 bg-white"><h3 className="border-b p-3 font-semibold">Nadchodzące mecze</h3>{renderRows(upcoming)}</section>
    <section className="rounded-2xl border border-sky-100 bg-white"><h3 className="border-b p-3 font-semibold">Zakończone mecze</h3>{renderRows(finished)}</section>
    <div className="text-xs text-slate-400">Stan na {today}. Rozgrywki V2.</div>
  </div>;
}
