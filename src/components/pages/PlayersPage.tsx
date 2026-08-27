import React from "react";
import { Search, UserRound, CalendarDays, Goal, ShieldAlert } from "lucide-react";
import { listPublicPlayerStatistics, type PublicPlayerStatistics } from "../../lib/playerStatistics";

const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pl-PL").trim();

export function PlayersPage() {
  const [rows, setRows] = React.useState<PublicPlayerStatistics[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [club, setClub] = React.useState("");
  const [birthYear, setBirthYear] = React.useState("");
  const [selectedPlayerId, setSelectedPlayerId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void listPublicPlayerStatistics()
      .then(data => { if (!cancelled) setRows(data); })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Nie udało się pobrać statystyk."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const players = React.useMemo(() => {
    const unique = new Map<string, { id: string; name: string }>();
    rows.forEach(row => unique.set(row.playerId, { id: row.playerId, name: `${row.firstName} ${row.lastName}` }));
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [rows]);
  const clubs = React.useMemo(() => [...new Set(rows.map(row => row.club))].sort((a, b) => a.localeCompare(b, "pl")), [rows]);
  const years = React.useMemo(() => [...new Set(rows.map(row => row.birthYear))].sort((a, b) => b - a), [rows]);
  const suggestions = React.useMemo(() => {
    const needle = normalize(query);
    if (needle.length < 2 || selectedPlayerId) return [];
    return players.filter(player => normalize(player.name).includes(needle)).slice(0, 8);
  }, [players, query, selectedPlayerId]);
  const visible = React.useMemo(() => rows.filter(row => {
    if (selectedPlayerId && row.playerId !== selectedPlayerId) return false;
    if (!selectedPlayerId && normalize(query).length >= 2 && !normalize(`${row.firstName} ${row.lastName}`).includes(normalize(query))) return false;
    if (club && row.club !== club) return false;
    if (birthYear && row.birthYear !== Number(birthYear)) return false;
    return true;
  }), [rows, query, selectedPlayerId, club, birthYear]);

  const choosePlayer = (id: string, name: string) => { setSelectedPlayerId(id); setQuery(name); };
  const resetPlayer = (value: string) => { setQuery(value); setSelectedPlayerId(""); };

  return <section className="space-y-5">
    <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(135deg,#f8fcff,#eef8ff)] p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2 text-sky-600"><UserRound className="h-6 w-6" /></span><div><div className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-600">Baza publiczna</div><h2 className="text-2xl font-bold text-[#061a33]">Zawodnicy</h2></div></div>
      <p className="mt-2 text-sm text-slate-600">Statystyki pochodzą wyłącznie z zatwierdzonych protokołów. Są rozdzielone według kategorii i klubu reprezentowanego w danej kategorii.</p>
    </div>

    <div className="grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-[minmax(0,1fr)_240px_160px]">
      <div className="relative">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Imię lub nazwisko</label>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => resetPlayer(event.target.value)} placeholder="Zacznij wpisywać…" className="w-full rounded-xl border border-sky-100 py-2.5 pl-10 pr-3 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" /></div>
        {suggestions.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xl">{suggestions.map(player => <button type="button" key={player.id} onClick={() => choosePlayer(player.id, player.name)} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-sky-50">{player.name}</button>)}</div>}
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Klub<select value={club} onChange={event => setClub(event.target.value)} className="mt-1 w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm font-normal normal-case outline-none focus:border-sky-300"><option value="">Wszystkie kluby</option>{clubs.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Rocznik<select value={birthYear} onChange={event => setBirthYear(event.target.value)} className="mt-1 w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm font-normal normal-case outline-none focus:border-sky-300"><option value="">Wszystkie</option>{years.map(year => <option key={year}>{year}</option>)}</select></label>
    </div>

    {loading && <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Ładowanie zawodników…</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {!loading && !error && visible.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">Nie znaleziono zawodnika ze statystykami w wybranej kategorii.</div>}
    <div className="grid gap-4 lg:grid-cols-2">{visible.map(row => <article key={`${row.playerId}-${row.categoryId}-${row.club}`} className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
      <header className="border-b border-sky-100 bg-[#f4faff] p-4"><div className="text-xl font-bold text-[#061a33]">{row.firstName} {row.lastName}</div><div className="mt-1 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white px-2.5 py-1 text-slate-600">Rocznik {row.birthYear}</span><span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-700">{row.categoryName}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{row.club}</span></div></header>
      <div className="grid grid-cols-3 border-b border-sky-100 text-center"><Stat icon={<CalendarDays />} label="Mecze" value={row.matchesPlayed} /><Stat icon={<Goal />} label="Bramki" value={row.goals} /><Stat icon={<ShieldAlert />} label="Wykluczenia" value={row.exclusions} /></div>
      <div className="p-4"><h3 className="mb-2 text-sm font-bold text-[#061a33]">Rozegrane mecze</h3><div className="space-y-2">{row.matches.map(match => <div key={match.id} className="grid gap-1 rounded-xl bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[90px_1fr_auto]"><span className="text-slate-500">{match.date}</span><span className="font-medium">{match.home} – {match.away}</span><span className="font-bold">{match.result || "—"}</span><span className="text-xs text-slate-500 sm:col-start-2">{match.club} • gole: {match.goals} • wykluczenia: {match.exclusions}</span></div>)}</div></div>
    </article>)}</div>
  </section>;
}

function Stat({ icon, label, value }: { icon: React.ReactElement; label: string; value: number }) {
  return <div className="border-r border-sky-100 p-4 last:border-r-0"><div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center text-sky-500">{React.cloneElement(icon, { className: "h-5 w-5" })}</div><div className="text-2xl font-bold text-[#061a33]">{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
