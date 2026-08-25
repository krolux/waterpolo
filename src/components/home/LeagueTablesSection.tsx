import React from "react";
import { Crown, Shield, Star } from "lucide-react";
import type { Match } from "../../types/wpolo";

type Row = { club: string; played: number; points: number; goalsFor: number; goalsAgainst: number };

type LeagueTablesSectionProps = {
  matches: Match[];
  competitionNameById?: Record<string, string>;
  tournamentNameById?: Record<string, string>;
  onOpenMore: () => void;
};

function parseScore(value?: string | null) {
  if (!value) return null;
  const match = String(value).match(/^\s*(\d+)\s*[:\-–—]\s*(\d+)\s*$/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function canonicalClubName(value: string) {
  const name = value.trim();
  const aliases: Record<string, string> = {
    Alfa: "IN-IN Tanie Ubezpieczenia Alfa Gorzów Wlkp.",
    Arkonia: "Arkonia Szczecin",
  };
  return aliases[name] || name;
}

export const LeagueTablesSection: React.FC<LeagueTablesSectionProps> = ({
  matches,
  competitionNameById,
  tournamentNameById,
  onOpenMore,
}) => {
  const tables = React.useMemo(() => {
    const grouped = new Map<string, Match[]>();

    matches.forEach((match) => {
      const groupName =
        (match.competitionSeasonId ? competitionNameById?.[match.competitionSeasonId] : null) ||
        (match.tournamentId ? tournamentNameById?.[match.tournamentId] : null) ||
        (match.competitionSeasonId ? "Ekstraklasa" : "Pozostałe");

      const bucket = grouped.get(groupName) || [];
      bucket.push(match);
      grouped.set(groupName, bucket);
    });

    return Array.from(grouped.entries())
      .map(([name, groupedMatches]) => {
        const stats = new Map<string, Row>();

        groupedMatches.forEach((match) => {
          const homeName = canonicalClubName(match.home || "");
          const awayName = canonicalClubName(match.away || "");
          if (!homeName || !awayName) return;

          if (!stats.has(homeName)) stats.set(homeName, { club: homeName, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0 });
          if (!stats.has(awayName)) stats.set(awayName, { club: awayName, played: 0, points: 0, goalsFor: 0, goalsAgainst: 0 });

          const score = parseScore(match.result);
          if (!score) return;

          const home = stats.get(homeName)!;
          const away = stats.get(awayName)!;

          home.played += 1;
          away.played += 1;
          home.goalsFor += score.home;
          home.goalsAgainst += score.away;
          away.goalsFor += score.away;
          away.goalsAgainst += score.home;

          if (match.shootout) {
            if (score.home > score.away) {
              home.points += 2;
              away.points += 1;
            } else {
              away.points += 2;
              home.points += 1;
            }
          } else if (score.home > score.away) {
            home.points += 3;
          } else if (score.away > score.home) {
            away.points += 3;
          }
        });

        const rows = Array.from(stats.values())
          .sort((left, right) => {
            const leftDiff = left.goalsFor - left.goalsAgainst;
            const rightDiff = right.goalsFor - right.goalsAgainst;
            return (
              right.points - left.points ||
              rightDiff - leftDiff ||
              right.goalsFor - left.goalsFor ||
              left.club.localeCompare(right.club)
            );
          });

        return { name, rows, playedMatches: groupedMatches.filter((m) => parseScore(m.result)).length };
      })
      .filter((group) => group.rows.length > 0 && (group.name !== "Pozostałe" || group.playedMatches > 0))
      .sort((left, right) => right.playedMatches - left.playedMatches || left.name.localeCompare(right.name))
      .slice(0, 3);
  }, [competitionNameById, matches, tournamentNameById]);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
      <div className="grid gap-4">
        {tables.length === 0 ? (
          <article className="rounded-2xl border border-[#e9edf2] bg-white p-4 text-sm text-slate-600 lg:col-span-3">
            Brak rozegranych meczów.
          </article>
        ) : null}
        {tables.map((table) => (
          <article key={table.name} className="rounded-2xl border border-[#e9edf2] bg-white p-4 shadow-[0_8px_20px_rgba(2,32,71,0.06)] transition hover:-translate-y-0.5 hover:border-[#b8dcff] hover:shadow-md">
            <h3 className="text-base font-semibold text-[#0A1F44]">{table.name}</h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-[#e9edf2]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5faff] text-[#0A1F44]">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Klub</th>
                    <th className="px-2 py-2 font-medium">M</th>
                    <th className="px-2 py-2 font-medium">Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 ? (
                    <tr className="border-t border-[#e9edf2] text-slate-600">
                      <td className="px-2 py-2" colSpan={4}>Brak rozegranych meczów.</td>
                    </tr>
                  ) : null}
                  {table.rows.map((row, idx) => (
                    <tr
                      key={row.club}
                      className={`border-t text-slate-700 ${
                        idx === 0
                          ? "border-amber-200 bg-amber-50"
                          : idx === 1
                            ? "border-slate-300 bg-slate-100"
                            : idx === 2
                              ? "border-orange-200 bg-orange-50"
                              : idx >= 5
                                ? "border-rose-100 bg-rose-50/80"
                                : "border-[#e9edf2] bg-white"
                      }`}
                    >
                      <td className="px-2 py-2">
                        <span className={`inline-flex min-w-[22px] justify-center rounded-md px-1.5 py-0.5 font-semibold ${
                          idx === 0
                            ? "bg-amber-300 text-amber-950"
                            : idx === 1
                              ? "bg-slate-300 text-slate-800"
                              : idx === 2
                                ? "bg-orange-300 text-orange-950"
                                : idx >= 5
                                  ? "bg-rose-200 text-rose-800"
                                  : "text-[#058CFF]"
                        }`}>{idx + 1}</span>
                      </td>
                      <td className="px-2 py-2 font-medium">{row.club}</td>
                      <td className="px-2 py-2">{row.played}</td>
                      <td className="px-2 py-2 font-semibold text-[#0A1F44]">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={onOpenMore} className="mt-3 rounded-lg border border-[#cde6ff] px-3 py-1.5 text-sm text-[#058CFF] transition hover:bg-sky-50">
              Pełna tabela
            </button>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-[#0A1F44]/15 bg-gradient-to-br from-[#0A1F44] via-[#10336b] to-[#0A1F44] p-5 text-slate-100 shadow-[0_16px_36px_rgba(15,23,42,0.32)]">
        <h3 className="text-lg font-semibold">Liderzy statystyk</h3>
        <p className="mt-1 text-xs text-slate-300">Statystyki indywidualne</p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-amber-300"><Crown className="h-4 w-4" /> Król strzelców</div>
            <div className="mt-1 text-sm text-slate-200">Statystyki będą dostępne po rozegraniu pierwszych spotkań.</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-sky-300"><Shield className="h-4 w-4" /> Najlepszy bramkarz</div>
            <div className="mt-1 text-sm text-slate-200">Statystyki będą dostępne po rozegraniu pierwszych spotkań.</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-amber-300"><Star className="h-4 w-4" /> MVP sezonu</div>
            <div className="mt-1 text-sm text-slate-200">Statystyki będą dostępne po rozegraniu pierwszych spotkań.</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-sky-300"><Crown className="h-4 w-4" /> Lider asyst</div>
            <div className="mt-1 text-sm text-slate-200">Statystyki będą dostępne po rozegraniu pierwszych spotkań.</div>
          </div>
        </div>

        <button disabled className="mt-5 cursor-not-allowed rounded-lg bg-gradient-to-r from-[#7bbcf6] to-[#9adbf4] px-3 py-1.5 text-sm font-medium text-white opacity-80">
          Więcej statystyk
        </button>
      </article>
    </section>
  );
};
