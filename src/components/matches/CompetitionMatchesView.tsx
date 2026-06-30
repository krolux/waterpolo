import React from "react";
import type { TournamentClub } from "../../lib/competitions";
import type { AppState, Match, Role } from "../../types/wpolo";
import { TournamentClubs } from "../tournaments/TournamentClubs";

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
          className="rounded-lg px-2 py-1 text-sm text-[#058CFF] transition hover:bg-sky-50"
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
          className="rounded-lg px-2 py-1 text-sm text-[#058CFF] transition hover:bg-sky-50"
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
        <TournamentClubs
          tournamentId={tournamentId}
          clubs={clubs}
          tournamentClubs={currentTournamentClubs}
          showAddTournamentClubForm={showAddTournamentClubForm}
          setShowAddTournamentClubForm={setShowAddTournamentClubForm}
          tournamentClubFormData={tournamentClubFormData}
          setTournamentClubFormData={setTournamentClubFormData}
          onAddTournamentClub={onAddTournamentClub}
          onDeleteTournamentClub={onDeleteTournamentClub}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />

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
