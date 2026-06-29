import React from "react";
import { ClubOverview } from "../club/ClubOverview";
import { mockPlayers } from "../club/mockPlayers";
import { PlayerTable } from "../club/PlayerTable";
import { RosterPanel } from "../club/RosterPanel";
import { Section } from "../shared/Section";
import { CalendarClock, Users } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";
import type { SaveRosterPayload } from "../../types/rosters";

type ClubDashboardProps = {
  effectiveUser: { name: string; role: Role; club?: string } | null;
  matches: Match[];
  tournamentNamesById?: Record<string, string>;
  penaltiesByMatch: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
  onSaveRoster?: (payload: SaveRosterPayload) => void;
};

export const ClubDashboard: React.FC<ClubDashboardProps> = ({
  effectiveUser,
  matches,
  tournamentNamesById = {},
  penaltiesByMatch: _penaltiesByMatch,
  onSaveRoster,
}) => {
  const myClub = effectiveUser?.club?.trim() || "";
  const [rosterContext, setRosterContext] = React.useState<React.ComponentProps<typeof RosterPanel>["context"]>(null);
  const maxBirthYearByTournamentId: Record<string, number> = {};

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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {upcomingClubMatches.map((match) => {
                const tournamentName = match.tournamentId ? (tournamentNamesById[match.tournamentId] || `Turniej ${match.tournamentId}`) : null;
                const badgeText = tournamentName || "Mecz ligowy";
                return (
                  <div key={match.id} className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm text-sm">
                    <div className="mb-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {badgeText}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>{formatDate(match.date)}</span>
                      <span>{match.time || "-"}</span>
                      <span>{match.location}</span>
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-800">{match.home} <span className="text-slate-400">vs</span> {match.away}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setRosterContext({
                          mode: "match",
                          matchId: match.id,
                          home: match.home,
                          away: match.away,
                          date: match.date,
                          time: match.time,
                          location: match.location,
                          tournamentId: match.tournamentId || undefined,
                          tournamentName: tournamentName || undefined,
                          maxBirthYear: match.tournamentId ? maxBirthYearByTournamentId[match.tournamentId] : undefined,
                        })}
                        className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        {match.tournamentId ? "Skład meczowy" : "Dodaj skład"}
                      </button>
                      {match.tournamentId ? (
                        <button
                          onClick={() => setRosterContext({
                            mode: "tournament",
                            matchId: match.id,
                            home: match.home,
                            away: match.away,
                            date: match.date,
                            time: match.time,
                            location: match.location,
                            tournamentId: match.tournamentId || undefined,
                            tournamentName: tournamentName || undefined,
                            maxBirthYear: maxBirthYearByTournamentId[match.tournamentId],
                          })}
                          className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Lista turniejowa
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <RosterPanel
            players={mockPlayers}
            context={rosterContext}
            onBack={() => setRosterContext(null)}
            clubName={myClub}
            canSaveRoster={effectiveUser?.role === "Club"}
            onSaveRoster={onSaveRoster}
          />
        </div>
      </Section>

      <Section title="Zawodnicy" icon={<Users className="w-5 h-5" />} className="bg-white/60">
        <PlayerTable players={mockPlayers} />
      </Section>
    </div>
  );
};
