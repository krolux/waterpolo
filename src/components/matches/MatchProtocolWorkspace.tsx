import React from "react";
import { FileCheck2, FileDown, Plus, Save, Trash2, X } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";
import { generateMatchProtocolPdf } from "../../lib/matchProtocolPdf";
import { PROTOCOL_EVENT_OPTIONS, blankProtocol, eventSymbol, loadProtocol, loadProtocolContext, playerGoals, playerMajorFouls, protocolScore, saveProtocol, type MatchProtocolDraft, type ProtocolContext, type ProtocolEventKind, type ProtocolTeam } from "../../lib/matchProtocol";

type User = { name: string; role: Role; club?: string };
const input = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-sky-400";
const isDelegate = (user: User, match: Match) => String(user.role).split(/[-+,\s]+/).includes("Admin") || match.delegate === user.name;

export function MatchProtocolWorkspace({ match, user, onClose }: { match: Match; user: User; onClose: () => void }) {
  const [protocol, setProtocol] = React.useState<MatchProtocolDraft>(() => loadProtocol(match.id));
  const [context, setContext] = React.useState<ProtocolContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [team, setTeam] = React.useState<ProtocolTeam>("home");
  const [kind, setKind] = React.useState<ProtocolEventKind>("goal");
  const [playerId, setPlayerId] = React.useState("");
  const [period, setPeriod] = React.useState<1 | 2 | 3 | 4 | "PS">(1);
  const [clock, setClock] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [grossUnsporting, setGrossUnsporting] = React.useState(false);
  const [highlightPlayer, setHighlightPlayer] = React.useState<string | null>(null);

  React.useEffect(() => { let active = true; setLoading(true); loadProtocolContext(match).then(value => { if (active) setContext(value); }).catch(() => { if (active) setError("Nie udało się pobrać składów meczowych."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [match]);
  React.useEffect(() => { if (protocol.status === "draft") saveProtocol(protocol); }, [protocol]);

  const players = team === "home" ? context?.homePlayers || [] : context?.awayPlayers || [];
  const homePlayers = context?.homePlayers || [];
  const awayPlayers = context?.awayPlayers || [];
  const score = protocolScore(protocol.events);
  const requiresReason = kind === "exclusion_substitution" || kind === "brutality";

  const addEvent = () => {
    if (!clock.trim()) return alert("Wpisz czas zdarzenia.");
    if (requiresReason && !reason.trim()) return alert("To zdarzenie wymaga uzasadnienia sędziego.");
    const needsPlayer = !["timeout", "official_penalty"].includes(kind);
    if (needsPlayer && !playerId) return alert("Wybierz zawodnika.");
    const event = { id: crypto.randomUUID(), period, clock: clock.trim(), team, playerId: playerId || null, kind, reason: reason.trim() || undefined, grossUnsporting: requiresReason ? grossUnsporting : undefined, createdAt: new Date().toISOString() } as const;
    setProtocol(current => ({ ...current, events: [...current.events, event], refereeNotes: reason.trim() ? `${current.refereeNotes}${current.refereeNotes ? "\n" : ""}${match.home} - ${match.away}, ${clock.trim()}: ${reason.trim()}${grossUnsporting ? " [rażące niesportowe zachowanie]" : ""}` : current.refereeNotes }));
    setClock(""); setReason(""); setGrossUnsporting(false);
  };

  const closeProtocol = () => {
    if (!isDelegate(user, match)) return alert("Protokół może zamknąć wyłącznie delegat tego meczu.");
    if (!protocol.finishedAt) return alert("Wpisz godzinę zakończenia spotkania.");
    const missing = protocol.events.find(event => ["exclusion_substitution", "brutality"].includes(event.kind) && !event.reason?.trim());
    if (missing) return alert("Uzupełnij wszystkie wymagane uzasadnienia sędziowskie.");
    const closed = { ...protocol, status: "closed" as const, closedAt: new Date().toISOString(), closedBy: user.name };
    setProtocol(closed); saveProtocol(closed);
  };

  const renderTeam = (side: ProtocolTeam, title: string, teamPlayers: typeof homePlayers) => (
    <section className={`rounded-xl border ${side === "away" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}`}>
      <div className="border-b px-3 py-2"><div className="font-semibold">{title}</div><input disabled={protocol.status === "closed"} className={`${input} mt-2`} placeholder="Trener" value={side === "home" ? protocol.homeCoach : protocol.awayCoach} onChange={event => setProtocol(current => ({ ...current, [side === "home" ? "homeCoach" : "awayCoach"]: event.target.value }))} /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[430px] text-xs"><thead><tr className="text-left"><th className="p-2">Nr</th><th className="p-2">Zawodnik</th><th className="p-2 text-center">Bramki</th><th className="p-2 text-center" colSpan={3}>Przewinienia główne</th></tr></thead><tbody>{Array.from({ length: 15 }, (_, index) => { const player = teamPlayers.find(item => item.slot === index + 1); const goals = player ? playerGoals(protocol.events, player.id) : 0; const fouls = player ? playerMajorFouls(protocol.events, player.id) : 0; return <tr key={index} className="border-t"><td className="p-2 font-semibold">{index + 1}</td><td className="p-2">{player?.name || <span className="text-slate-400">—</span>}{player?.isCaptain ? " (C)" : ""}{player?.isGoalkeeper ? " (GK)" : ""}</td><td className="p-2 text-center"><button type="button" disabled={!player || goals === 0} onMouseEnter={() => player && setHighlightPlayer(player.id)} onMouseLeave={() => setHighlightPlayer(null)} className={goals ? "rounded bg-amber-100 px-2 py-1 font-bold text-amber-800" : ""}>{goals || "—"}</button></td>{[1, 2, 3].map(n => <td key={n} className="w-8 p-2 text-center">{fouls >= n ? "●" : ""}</td>)}</tr>; })}</tbody></table></div>
    </section>
  );

  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/60 p-2 sm:p-5">
    <div className="mx-auto min-h-full max-w-7xl rounded-2xl bg-slate-50 shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b bg-white px-4 py-3"><div><div className="text-xs font-semibold uppercase tracking-widest text-amber-600">Prywatny prototyp - tylko localhost</div><h2 className="text-xl font-bold text-[#061a33]">Protokół: {match.home} - {match.away}</h2><p className="text-sm text-slate-600">{match.date}{match.time ? `, ${match.time}` : ""} • {match.location} • Sędziowie: {match.referees.join(", ") || "—"} • Delegat: {match.delegate || "—"}</p></div><button onClick={onClose} className="rounded-lg border p-2" aria-label="Zamknij protokół"><X className="h-5 w-5" /></button></header>
      <main className="space-y-4 p-3 sm:p-5">
        {loading ? <div className="rounded-xl bg-white p-4">Pobieranie składów…</div> : null}{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}
        <div className="grid gap-3 lg:grid-cols-2">{renderTeam("home", match.home, homePlayers)}{renderTeam("away", match.away, awayPlayers)}</div>
        <section className="rounded-2xl border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Dodaj zdarzenie</h3><div className="rounded-xl bg-[#061a33] px-4 py-2 text-xl font-bold text-white">{score.home} : {score.away}</div></div>
          {protocol.status === "draft" ? <div className="mt-3 grid gap-2 md:grid-cols-6"><select className={input} value={period} onChange={e => setPeriod(e.target.value === "PS" ? "PS" : Number(e.target.value) as 1|2|3|4)}><option value={1}>I kwarta</option><option value={2}>II kwarta</option><option value={3}>III kwarta</option><option value={4}>IV kwarta</option><option value="PS">Rzuty karne</option></select><input className={input} placeholder="Czas, np. 06:42" value={clock} onChange={e => setClock(e.target.value)} /><select className={input} value={team} onChange={e => { setTeam(e.target.value as ProtocolTeam); setPlayerId(""); }}><option value="home">{match.home}</option><option value="away">{match.away}</option></select><select className={input} value={kind} onChange={e => setKind(e.target.value as ProtocolEventKind)}>{PROTOCOL_EVENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.symbol}. {option.label}</option>)}</select><select className={input} value={playerId} onChange={e => setPlayerId(e.target.value)}><option value="">Zawodnik / oficjel</option>{players.map(player => <option key={player.id} value={player.id}>#{player.capNumber} {player.name}</option>)}</select><button onClick={addEvent} className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-500 px-3 py-2 font-semibold text-white"><Plus className="h-4 w-4" />Dodaj</button>{requiresReason ? <div className="md:col-span-6 grid gap-2 md:grid-cols-[1fr_auto]"><textarea className={input} placeholder="Obowiązkowe uzasadnienie sędziego" value={reason} onChange={e => setReason(e.target.value)} /><label className="flex items-center gap-2 rounded-lg border bg-red-50 px-3 text-sm text-red-800"><input type="checkbox" checked={grossUnsporting} onChange={e => setGrossUnsporting(e.target.checked)} /> Rażące niesportowe zachowanie</label></div> : null}</div> : <div className="mt-3 rounded-xl bg-green-50 p-3 font-semibold text-green-800">Protokół zamknięty przez: {protocol.closedBy}</div>}
        </section>
        <section className="rounded-2xl border bg-white"><h3 className="border-b p-3 text-lg font-bold">Przebieg gry</h3><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-slate-50 text-left"><th className="p-2">Lp.</th><th className="p-2">Kwarta</th><th className="p-2">Czas</th><th className="p-2">Drużyna</th><th className="p-2">Zawodnik</th><th className="p-2">Symbol</th><th className="p-2">Wynik</th><th className="p-2"></th></tr></thead><tbody>{protocol.events.map((event, index) => { const roster = event.team === "home" ? homePlayers : awayPlayers; const player = roster.find(item => item.id === event.playerId); const running = protocolScore(protocol.events.slice(0, index + 1)); const highlighted = highlightPlayer && event.kind === "goal" && event.playerId === highlightPlayer; return <tr key={event.id} className={`border-t transition ${highlighted ? "bg-amber-200 ring-2 ring-inset ring-amber-400" : ""}`}><td className="p-2">{index + 1}</td><td className="p-2">{event.period}</td><td className="p-2">{event.clock}</td><td className="p-2">{event.team === "home" ? match.home : match.away}</td><td className="p-2">{player ? `#${player.capNumber} ${player.name}` : "Oficjel / drużyna"}</td><td className="p-2 font-bold">{eventSymbol(event.kind)}</td><td className="p-2 font-bold">{running.home}:{running.away}</td><td className="p-2 text-right">{protocol.status === "draft" ? <button onClick={() => setProtocol(current => ({ ...current, events: current.events.filter(item => item.id !== event.id) }))} className="text-red-600"><Trash2 className="h-4 w-4" /></button> : null}</td></tr>; })}{!protocol.events.length ? <tr><td colSpan={8} className="p-5 text-center text-slate-500">Brak zdarzeń.</td></tr> : null}</tbody></table></div></section>
        <section className="grid gap-3 rounded-2xl border bg-white p-3 md:grid-cols-2"><div><label className="text-sm font-semibold">Uwagi sędziowskie</label><textarea disabled={protocol.status === "closed"} className={`${input} mt-1 min-h-28`} value={protocol.refereeNotes} onChange={e => setProtocol(current => ({ ...current, refereeNotes: e.target.value }))} /></div><div className="space-y-3"><label className="block text-sm font-semibold">Godzina zakończenia<input disabled={protocol.status === "closed"} type="time" className={`${input} mt-1`} value={protocol.finishedAt} onChange={e => setProtocol(current => ({ ...current, finishedAt: e.target.value }))} /></label><label className="flex items-center gap-2"><input disabled={protocol.status === "closed"} type="checkbox" checked={protocol.protest} onChange={e => setProtocol(current => ({ ...current, protest: e.target.checked }))} /> Protest</label>{protocol.events.some(event => event.grossUnsporting) ? <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">System wykrył zdarzenie skutkujące automatycznym zawieszeniem. W tej prywatnej wersji zawieszenie nie jest jeszcze zapisywane do produkcyjnej bazy.</div> : null}</div></section>
        <div className="flex flex-wrap justify-end gap-2 pb-3"><button onClick={() => { saveProtocol(protocol); alert("Wersja robocza zapisana lokalnie."); }} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold"><Save className="h-4 w-4" />Zapisz roboczo</button>{protocol.status === "draft" ? <button onClick={closeProtocol} disabled={!isDelegate(user, match)} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-40"><FileCheck2 className="h-4 w-4" />Zamknij protokół</button> : <button onClick={() => context && void generateMatchProtocolPdf(match, protocol, homePlayers, awayPlayers)} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white"><FileDown className="h-4 w-4" />Pobierz PDF</button>}</div>
      </main>
    </div>
  </div>;
}
