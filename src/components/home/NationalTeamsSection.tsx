import React from "react";
import type { Match } from "../../types/wpolo";

type NationalTeamsSectionProps = {
  matches: Match[];
  competitionNameById?: Record<string, string>;
  tournamentNameById?: Record<string, string>;
  onOpenMore: () => void;
};

type TeamCard = {
  key: string;
  title: string;
  nearestMatch: Match | null;
  lastPlayed: Match | null;
  categoryLabel: string;
};

function dateValue(match: Match) {
  const ts = new Date(`${match.date}T${match.time || "00:00"}:00`).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function inferTeamLabel(source: string) {
  const value = source.toLowerCase();
  if (value.includes("kobiet") || value.includes("seniorek") || value.includes("women")) return "Seniorki";
  if (value.includes("u17")) return "U17";
  if (value.includes("u19")) return "U19";
  if (value.includes("u15")) return "U15";
  if (value.includes("u13")) return "U13";
  if (value.includes("junior")) return "Juniorzy";
  return "Seniorzy";
}

function oppositeTeam(match: Match) {
  if (/polska/i.test(match.home) && !/polska/i.test(match.away)) return match.away;
  if (/polska/i.test(match.away) && !/polska/i.test(match.home)) return match.home;
  return `${match.home} vs ${match.away}`;
}

function prettyDate(date?: string, time?: string) {
  if (!date) return "Data do potwierdzenia";
  const ts = new Date(date);
  if (Number.isNaN(ts.getTime())) return "Data do potwierdzenia";
  const base = ts.toLocaleDateString("pl-PL");
  return time ? `${base} • ${time}` : base;
}

export const NationalTeamsSection: React.FC<NationalTeamsSectionProps> = ({
  matches,
  competitionNameById,
  tournamentNameById,
  onOpenMore,
}) => {
  const cards = React.useMemo<TeamCard[]>(() => {
    const nationalMatches = matches.filter((match) => /polska/i.test(match.home) || /polska/i.test(match.away));
    if (nationalMatches.length === 0) return [];

    const grouped = new Map<string, Match[]>();
    nationalMatches.forEach((match) => {
      const sourceName =
        (match.competitionSeasonId ? competitionNameById?.[match.competitionSeasonId] : null) ||
        (match.tournamentId ? tournamentNameById?.[match.tournamentId] : null) ||
        "Seniorzy";

      const teamLabel = inferTeamLabel(sourceName);
      const arr = grouped.get(teamLabel) || [];
      arr.push(match);
      grouped.set(teamLabel, arr);
    });

    return Array.from(grouped.entries())
      .map(([teamLabel, teamMatches]) => {
        const upcoming = teamMatches
          .filter((match) => dateValue(match) >= Date.now())
          .sort((left, right) => dateValue(left) - dateValue(right))[0] || null;

        const finished = teamMatches
          .filter((match) => !!match.result && match.result.trim() !== "")
          .sort((left, right) => dateValue(right) - dateValue(left))[0] || null;

        const sourceName =
          (upcoming?.competitionSeasonId ? competitionNameById?.[upcoming.competitionSeasonId] : null) ||
          (upcoming?.tournamentId ? tournamentNameById?.[upcoming.tournamentId] : null) ||
          (finished?.competitionSeasonId ? competitionNameById?.[finished.competitionSeasonId] : null) ||
          (finished?.tournamentId ? tournamentNameById?.[finished.tournamentId] : null) ||
          "Reprezentacja Polski";

        return {
          key: teamLabel,
          title: teamLabel,
          nearestMatch: upcoming,
          lastPlayed: finished,
          categoryLabel: sourceName,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 4);
  }, [competitionNameById, matches, tournamentNameById]);

  if (cards.length === 0) {
    return <div className="rounded-2xl border border-[#e9edf2] bg-white p-4 text-sm text-slate-600">Brak powołań.</div>;
  }
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((team) => (
        <article key={team.key} className="overflow-hidden rounded-3xl border border-[#e9edf2] bg-white shadow-[0_8px_20px_rgba(2,32,71,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="relative">
            <div className="flex h-44 w-full items-center justify-center bg-[linear-gradient(145deg,#f2f7fc_0%,#e9edf2_100%)] text-sm text-slate-500">
              Brak zdjęcia reprezentacji
            </div>
            <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-white/95 px-2 py-1 text-xs font-semibold text-[#0A1F44]">🇵🇱 Kadra</span>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#058CFF] via-[#2CC0FF] to-[#F5B32E]" />
            <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-[#0A1F44]">
              {team.categoryLabel}
            </div>
          </div>
          <div className="space-y-2 p-4">
            <h3 className="text-lg font-semibold text-[#0A1F44]">{team.title}</h3>
            <div className="rounded-xl border border-[#e9edf2] bg-[#f8fcff] px-3 py-2 text-xs text-slate-600">
              <div className="font-medium text-slate-700">Najbliższy mecz</div>
              {team.nearestMatch ? (
                <div className="mt-1">{oppositeTeam(team.nearestMatch)} • {prettyDate(team.nearestMatch.date, team.nearestMatch.time)}</div>
              ) : (
                <div className="mt-1">Brak zaplanowanych meczów.</div>
              )}
            </div>
            <div className="rounded-xl border border-[#e9edf2] bg-[#f8fcff] px-3 py-2 text-xs text-slate-600">
              <div className="font-medium text-slate-700">Ostatni wynik</div>
              {team.lastPlayed ? (
                <div className="mt-1">{oppositeTeam(team.lastPlayed)} • {team.lastPlayed.result}</div>
              ) : (
                <div className="mt-1">Brak rozegranych meczów.</div>
              )}
            </div>
            <button onClick={onOpenMore} className="rounded-lg border border-[#cde6ff] px-3 py-1.5 text-sm font-medium text-[#058CFF] transition hover:bg-sky-50">
              Więcej
            </button>
          </div>
        </article>
      ))}
    </section>
  );
};
