import React from "react";
import { MatchRosterPanel } from "./MatchRosterPanel";
import { RosterSearch } from "./RosterSearch";
import { TournamentRosterPanel } from "./TournamentRosterPanel";
import { useRosterPanel } from "../../hooks/useRosterPanel";
import type { Player } from "../../types/club";

type RosterPanelProps = {
  message?: string;
  players?: Player[];
};

export const RosterPanel: React.FC<RosterPanelProps> = ({
  message = "Brak zgłoszonego składu.",
  players = [],
}) => {
  const roster = useRosterPanel(players);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-700">
        {roster.tournamentCount === 0 ? message : "Workflow: zawodnicy klubu -> lista turniejowa -> lista meczowa."}
      </div>
      {roster.warning ? <div className="text-sm text-red-600">{roster.warning}</div> : null}
      {(roster.tournamentLimitReached || roster.matchLimitReached) ? <div className="text-sm text-red-600">Osiągnięto maksymalny limit zawodników.</div> : null}
      <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm text-gray-600">
        Numer czepka na liście startowej będzie można zmienić bez zmiany domyślnego numeru zawodnika.
      </div>

      <RosterSearch query={roster.query} sortMode={roster.sortMode} onQueryChange={roster.setQuery} onSortModeChange={roster.setSortMode} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TournamentRosterPanel
          players={roster.filteredTournamentRoster}
          count={roster.tournamentCount}
          limitReached={roster.tournamentLimitReached}
          matchLimitReached={roster.matchLimitReached}
          onAddPlayers={roster.addPlayersToTournamentRoster}
          onCopy={roster.copyPreviousTournamentRoster}
          onClear={roster.clearTournamentRoster}
          onAddToMatch={roster.addToMatchRoster}
          onUpdateTournamentCapNumber={roster.updateTournamentCapNumber}
          onToggleGoalkeeper={roster.toggleGoalkeeper}
          onToggleCaptain={roster.toggleCaptain}
        />

        <MatchRosterPanel
          players={roster.filteredMatchRoster}
          count={roster.matchCount}
          limitReached={roster.matchLimitReached}
          onCopyPreviousMatch={roster.copyPreviousMatchRoster}
          onCopyPreviousTournament={roster.copyPreviousTournamentRoster}
          onCopyLastRoster={roster.copyLastRoster}
          onClear={roster.clearMatchRoster}
          onRemoveFromMatch={roster.removeFromMatchRoster}
          onMoveMatchPlayer={roster.moveMatchPlayer}
          onUpdateMatchCapNumber={roster.updateMatchCapNumber}
          onToggleGoalkeeper={roster.toggleGoalkeeper}
          onToggleCaptain={roster.toggleCaptain}
        />
      </div>
    </div>
  );
};