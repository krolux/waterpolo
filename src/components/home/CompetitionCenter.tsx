import React from "react";
import { CalendarDays, Flag, MapPin, Trophy } from "lucide-react";
import type { Match } from "../../types/wpolo";
import type { Tournament } from "../../lib/competitions";

type CompetitionCenterProps = {
  matches: Match[];
  tournaments: Tournament[];
  onOpenMore: () => void;
};

function toDateValue(date: string, time?: string | null): number {
  const iso = `${date}T${time || "00:00"}:00`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? Number.MAX_SAFE_INTEGER : dt.getTime();
}

export const CompetitionCenter: React.FC<CompetitionCenterProps> = ({ matches, tournaments, onOpenMore }) => {
  const now = Date.now();

  const upcomingMatches = matches
    .filter((m) => toDateValue(m.date, m.time) >= now && (!m.result || !m.result.trim()))
    .sort((a, b) => toDateValue(a.date, a.time) - toDateValue(b.date, b.time))
    .slice(0, 5);

  const recentResults = matches
    .filter((m) => !!m.result && m.result.trim() !== "")
    .sort((a, b) => toDateValue(b.date, b.time) - toDateValue(a.date, a.time))
    .slice(0, 5);

  const activeTournaments = tournaments
    .slice()
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
    .slice(0, 5);

  const cards = [
    {
      title: "Najbliższe mecze",
      icon: <CalendarDays className="h-5 w-5 text-amber-600" />,
      content: (
        <ul className="space-y-2.5">
          {upcomingMatches.length === 0 ? <li className="text-sm text-slate-500">Brak danych.</li> : null}
          {upcomingMatches.map((match) => (
            <li key={match.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="font-medium text-slate-800">{match.home} vs {match.away}</div>
              <div className="mt-1">{new Date(match.date).toLocaleDateString("pl-PL")} • {match.time || "--:--"}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-slate-500"><MapPin className="h-3.5 w-3.5" />{match.location}</div>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Ostatnie wyniki",
      icon: <Flag className="h-5 w-5 text-amber-600" />,
      content: (
        <ul className="space-y-2.5">
          {recentResults.length === 0 ? <li className="text-sm text-slate-500">Brak danych.</li> : null}
          {recentResults.map((match) => (
            <li key={match.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="font-medium text-slate-800">{match.home} <span className="mx-1 rounded bg-slate-200 px-1.5 py-0.5 text-slate-900">{match.result}</span> {match.away}</div>
              <div className="mt-1">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Aktywne turnieje",
      icon: <Trophy className="h-5 w-5 text-amber-600" />,
      content: (
        <ul className="space-y-2.5">
          {activeTournaments.length === 0 ? <li className="text-sm text-slate-500">Brak danych.</li> : null}
          {activeTournaments.map((tournament) => (
            <li key={tournament.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="font-medium text-slate-800">{tournament.name}</div>
              <div className="mt-1">{tournament.tournament_type || "Turniej"}</div>
              <div className="mt-1">
                {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("pl-PL") : "Data do potwierdzenia"}
              </div>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-3 flex items-center gap-2">
            {card.icon}
            <h3 className="text-base font-semibold text-slate-800">{card.title}</h3>
          </div>

          {card.content}

          <button
            onClick={onOpenMore}
            className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Zobacz wszystkie
          </button>
        </article>
      ))}
    </section>
  );
};
