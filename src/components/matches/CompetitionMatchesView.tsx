import React from "react";
import type { TournamentClub } from "../../lib/competitions";
import type { AppState, Match, Role } from "../../types/wpolo";

type CompetitionMatchesViewProps = {
  mode: "competition" | "tournament";
  competitionSeasonId?: string | null;
  stageId?: string | null;
  tournamentId?: string | null;
  matches: Match[];
  penalties: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
  documents?: Match[];
  currentUser: { name: string; role: Role; club?: string } | null;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  clubs: readonly string[];
  refereeNames: string[];
  delegateNames: string[];
  delegateCandidateNames: string[];
  onRefreshMatches: () => void;
  loadingMatches: boolean;
  onRemovePenalty: (id: string) => void;
  onQuickEdit: (matchId: string) => void;
  onCancelEdit: () => void;
  editingMatchId?: string | null;
  tournamentClubs?: Map<string, TournamentClub[]>;
  showAddTournamentClubForm?: boolean;
  setShowAddTournamentClubForm?: React.Dispatch<React.SetStateAction<boolean>>;
  tournamentClubFormData?: { clubName: string };
  setTournamentClubFormData?: React.Dispatch<React.SetStateAction<{ clubName: string }>>;
  onAddTournamentClub?: (tournamentId: string) => void;
  onDeleteTournamentClub?: (clubId: string, tournamentId: string) => void;
  onAddMatch?: (tournamentId: string) => void;
  isAdmin: (user: { role: Role }) => boolean;
  renderMatchesTable: (params: {
    title: string;
    variant: "upcoming" | "finished";
    sectionClassName?: string;
    showExport?: boolean;
    tableState: AppState;
    currentUser: { name: string; role: Role; club?: string } | null;
  }) => React.ReactNode;
  renderRankingTable: (params: { matches: Match[]; clubs: readonly string[] }) => React.ReactNode;
  renderCompetitionAdminPanel: () => React.ReactNode;
};

export const CompetitionMatchesView: React.FC<CompetitionMatchesViewProps> = ({
  mode,
  tournamentId,
  matches,
  documents,
  currentUser,
  state,
  clubs,
  onAddMatch,
  onDeleteTournamentClub,
  onAddTournamentClub,
  showAddTournamentClubForm,
  setShowAddTournamentClubForm,
  tournamentClubFormData,
  setTournamentClubFormData,
  tournamentClubs,
  isAdmin,
  renderMatchesTable,
  renderRankingTable,
  renderCompetitionAdminPanel,
}) => {
  const effectiveMatches = documents ?? matches;
  const isCompetitionView = mode === "competition";
  const isTournamentView = mode === "tournament";
  const currentTournamentClubs = tournamentId ? (tournamentClubs?.get(tournamentId) ?? []) : [];

  const upcomingViewMatches = effectiveMatches.filter(m => !m.result || m.result.trim() === "");
  const finishedViewMatches = effectiveMatches.filter(m => !!m.result && m.result.trim() !== "");

  const matchesSection = effectiveMatches.length === 0 ? (
    <div className="p-2">
      <div className="text-sm text-gray-500 mb-2">Brak meczów w tym turnieju</div>
      {isTournamentView && currentUser && isAdmin(currentUser) && onAddMatch && tournamentId && (
        <button
          onClick={() => onAddMatch(tournamentId)}
          className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
        >
          + Dodaj mecz
        </button>
      )}
    </div>
  ) : (
    <div className="space-y-4 p-2">
      {renderMatchesTable({
        title: "Nadchodzące mecze",
        variant: "upcoming",
        showExport: true,
        tableState: { ...state, matches: upcomingViewMatches },
        currentUser,
      })}

      {renderMatchesTable({
        title: "Zakończone mecze",
        variant: "finished",
        sectionClassName: "bg-white/60",
        tableState: { ...state, matches: finishedViewMatches },
        currentUser,
      })}

      {isTournamentView && currentUser && isAdmin(currentUser) && onAddMatch && tournamentId && (
        <button
          onClick={() => onAddMatch(tournamentId)}
          className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
        >
          + Dodaj mecz
        </button>
      )}
    </div>
  );

  if (isCompetitionView) {
    return (
      <>
        {renderRankingTable({ matches: state.matches, clubs })}

        {matchesSection}

        {currentUser && isAdmin(currentUser) && renderCompetitionAdminPanel()}
      </>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold text-gray-900">Drużyny w turnieju</div>
              <div className="text-sm text-gray-500">Dodaj i usuń kluby przypisane do tego turnieju.</div>
            </div>
            {currentUser && isAdmin(currentUser) && setShowAddTournamentClubForm && (
              <button
                onClick={() => setShowAddTournamentClubForm(prev => !prev)}
                className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
              >
                {showAddTournamentClubForm ? "Ukryj formularz" : "+ Dodaj klub"}
              </button>
            )}
          </div>

          {currentUser &&
            isAdmin(currentUser) &&
            showAddTournamentClubForm &&
            tournamentClubFormData &&
            setTournamentClubFormData &&
            onAddTournamentClub &&
            tournamentId && (
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={tournamentClubFormData.clubName}
                    onChange={e => setTournamentClubFormData({ clubName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Wybierz klub</option>
                    {clubs.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onAddTournamentClub(tournamentId)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Dodaj klub
                  </button>
                </div>
              </div>
            )}

          {currentTournamentClubs.length === 0 ? (
            <div className="text-sm text-gray-500">Brak przypisanych drużyn do tego turnieju.</div>
          ) : (
            <div className="space-y-2">
              {currentTournamentClubs.map(club => (
                <div key={club.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span>{club.club_name}</span>
                  {currentUser && isAdmin(currentUser) && onDeleteTournamentClub && tournamentId && (
                    <button
                      onClick={() => onDeleteTournamentClub(club.id, tournamentId)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Usuń
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {currentTournamentClubs.length > 0 &&
          renderRankingTable({
            matches: effectiveMatches,
            clubs: currentTournamentClubs.map(c => c.club_name),
          })}
      </div>

      {matchesSection}
    </div>
  );
};
