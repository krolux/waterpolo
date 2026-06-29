import React from "react";
import { ClubOverview } from "../club/ClubOverview";
import { mockPlayers } from "../club/mockPlayers";
import { PlayerTable } from "../club/PlayerTable";
import { RosterPanel } from "../club/RosterPanel";
import { Section } from "../shared/Section";
import { CalendarClock, Users } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";

type ClubDashboardProps = {
  effectiveUser: { name: string; role: Role; club?: string } | null;
  matches: Match[];
  tournamentNamesById?: Record<string, string>;
  penaltiesByMatch: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
};

export const ClubDashboard: React.FC<ClubDashboardProps> = ({
  effectiveUser,
  matches,
  tournamentNamesById = {},
  penaltiesByMatch: _penaltiesByMatch,
}) => {
  const myClub = effectiveUser?.club?.trim() || "";
  const [rosterContext, setRosterContext] = React.useState<React.ComponentProps<typeof RosterPanel>["context"]>(null);

  const parseMatchDateTime = React.useCallback((match: Match) => new Date(`${match.date}T${match.time || "00:00"}`), []);

  const upcomingClubMatches = React.useMemo(() => {
    if (!myClub) return [] as Match[];
    return matches
      .filter((match) => (match.home === myClub || match.away === myClub) && (!match.result || match.result.trim() === ""))
      .sort((a, b) => parseMatchDateTime(a).getTime() - parseMatchDateTime(b).getTime())
      .slice(0, 6);
  }, [matches, myClub, parseMatchDateTime]);

  const formatDate = React.useCallback((date: string) => new Date(date).toLocaleDateString("pl-PL"), []);

  return (
    <div className="space-y-4">
      <ClubOverview effectiveUser={effectiveUser} matches={matches} />

      <Section title="Lista startowa" icon={<Users className="w-5 h-5" />} className="bg-white/60">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarClock className="h-4 w-4" />
            <span>Najbliższe mecze mojego klubu</span>
          </div>

          {upcomingClubMatches.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white/70 p-3 text-sm text-gray-500">
              Brak nadchodzących meczów dla Twojego klubu.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {upcomingClubMatches.map((match) => {
                const tournamentName = match.tournamentId ? (tournamentNamesById[match.tournamentId] || `Turniej ${match.tournamentId}`) : null;
                return (
                  <div key={match.id} className="rounded-lg border border-slate-200 bg-white/80 p-3 text-sm">
                    <div className="font-semibold text-slate-700">{formatDate(match.date)}</div>
                    <div className="text-xs text-slate-500">{match.time || "-"}</div>
                    <div className="mt-1 text-xs text-slate-600">Gospodarz: <span className="font-medium">{match.home}</span></div>
                    <div className="text-xs text-slate-600">Gość: <span className="font-medium">{match.away}</span></div>
                    <div className="text-xs text-slate-600">Miejsce: {match.location}</div>
                    {tournamentName ? <div className="text-xs text-slate-600">Turniej: {tournamentName}</div> : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => setRosterContext({ mode: "match", title: `Skład dla meczu: ${match.home} vs ${match.away}`, subtitle: `${formatDate(match.date)}${match.time ? `, ${match.time}` : ""} • ${match.location}` })}
                        className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Dodaj skład
                      </button>
                      {match.tournamentId ? (
                        <button
                          onClick={() => setRosterContext({ mode: "tournament", title: `Skład turniejowy: ${tournamentName || "Turniej"}`, subtitle: `${formatDate(match.date)}${match.time ? `, ${match.time}` : ""} • ${match.location}` })}
                          className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Dodaj skład turniejowy
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rosterContext ? (
            <RosterPanel players={mockPlayers} context={rosterContext} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-3 text-sm text-slate-500">
              Wybierz mecz lub turniej z kart powyżej, aby otworzyć panel tworzenia listy startowej.
            </div>
          )}
        </div>
      </Section>

      <Section title="Zawodnicy" icon={<Users className="w-5 h-5" />} className="bg-white/60">
        <PlayerTable players={mockPlayers} />
      </Section>
    </div>
  );
};
