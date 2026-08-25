import React from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { Match } from "../../types/wpolo";

type NationalTeamsSectionProps = {
  matches: Match[];
  competitionNameById?: Record<string, string>;
  onOpenMore: () => void;
};

function dateValue(match: Match) {
  const ts = new Date(`${match.date}T${match.time || "00:00"}:00`).getTime();
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
}

function prettyDate(match: Match) {
  const date = new Date(`${match.date}T00:00:00`);
  const formatted = Number.isNaN(date.getTime()) ? match.date : date.toLocaleDateString("pl-PL");
  return match.time ? `${formatted}, godz. ${match.time}` : `${formatted} • godzina do potwierdzenia`;
}

export const NationalTeamsSection: React.FC<NationalTeamsSectionProps> = ({ matches, competitionNameById, onOpenMore }) => {
  const upcoming = React.useMemo(() => matches
    .filter((match) => {
      if (dateValue(match) < Date.now() || match.result?.trim()) return false;
      const competitionName = match.competitionSeasonId ? competitionNameById?.[match.competitionSeasonId] || "" : "";
      return /reprezentacja polski|kadra polski/i.test(competitionName) || /polska/i.test(match.home) || /polska/i.test(match.away);
    })
    .sort((left, right) => dateValue(left) - dateValue(right))
    .slice(0, 6), [competitionNameById, matches]);

  return (
    <div>
      {upcoming.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((match) => (
            <article key={match.id} className="rounded-2xl border border-red-100 bg-[linear-gradient(145deg,#fff_0%,#fff7f7_100%)] p-4 shadow-[0_8px_20px_rgba(2,32,71,0.06)]">
              <div className="mb-3 h-1 rounded-full bg-gradient-to-r from-red-600 via-red-400 to-white" />
              <div className="font-semibold leading-snug text-[#0A1F44]">{match.home} <span className="text-red-600">–</span> {match.away}</div>
              <div className="mt-3 flex items-start gap-2 text-xs text-slate-600"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><span>{prettyDate(match)}</span></div>
              <div className="mt-2 flex items-start gap-2 text-xs text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><span>{match.location || "Miejsce do potwierdzenia"}</span></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-red-100 bg-[#fffafa] p-4 text-sm text-slate-600">Brak zaplanowanych meczów reprezentacji Polski.</div>
      )}
      <button onClick={onOpenMore} className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50">Więcej</button>
    </div>
  );
};
