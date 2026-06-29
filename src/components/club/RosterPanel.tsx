import React from "react";
import { MatchRosterPanel } from "./MatchRosterPanel";
import { RosterSearch } from "./RosterSearch";
import { TournamentRosterPanel } from "./TournamentRosterPanel";
import { useRosterPanel } from "../../hooks/useRosterPanel";
import type { Player } from "../../types/club";

export type RosterContext =
  | {
      mode: "match";
      title: string;
      subtitle?: string;
    }
  | {
      mode: "tournament";
      title: string;
      subtitle?: string;
    };

type RosterPanelProps = {
  message?: string;
  players?: Player[];
  context?: RosterContext | null;
};

export const RosterPanel: React.FC<RosterPanelProps> = ({
  message = "Brak zgłoszonego składu.",
  players = [],
  context = null,
}) => {
  const roster = useRosterPanel(players);
  const contextTitle = context?.title ?? "Wybierz mecz lub turniej, aby rozpocząć tworzenie składu.";
  const contextSubtitle = context?.subtitle ?? "Workflow: zawodnicy klubu -> lista turniejowa -> lista meczowa.";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
        <div className="text-sm font-semibold text-slate-700">{contextTitle}</div>
        <div className="text-xs text-slate-600">{contextSubtitle}</div>
      </div>
      <div className="text-sm text-gray-700">
        {roster.tournamentCount === 0 ? message : "Skład jest przygotowywany na stałych slotach 1-17 i 1-15."}
      </div>
      {roster.warning ? <div className="text-sm text-red-600">{roster.warning}</div> : null}
      {(roster.tournamentLimitReached || roster.matchLimitReached) ? <div className="text-sm text-red-600">Osiągnięto maksymalny limit zawodników.</div> : null}

      <RosterSearch query={roster.query} sortMode={roster.sortMode} onQueryChange={roster.setQuery} onSortModeChange={roster.setSortMode} />

      <div className="grid gap-3 lg:grid-cols-2">
        <TournamentRosterPanel
          availablePlayers={roster.availablePlayers}
          slots={roster.tournamentSlots}
          count={roster.tournamentCount}
          limitReached={roster.tournamentLimitReached}
          onAddPlayers={roster.addPlayersToTournamentRoster}
          onAddPlayer={roster.addPlayerToTournamentRoster}
          onCopy={roster.copyPreviousTournamentRoster}
          onClear={roster.clearTournamentRoster}
          onMoveTournamentPlayer={roster.moveTournamentPlayer}
          onRemoveFromTournament={roster.removeFromTournamentRoster}
          onToggleGoalkeeper={roster.toggleTournamentGoalkeeper}
          onToggleCaptain={roster.toggleTournamentCaptain}
        />

        <MatchRosterPanel
          slots={roster.matchSlots}
          count={roster.matchCount}
          limitReached={roster.matchLimitReached}
          onCopyPreviousMatch={roster.copyPreviousMatchRoster}
          onCopyPreviousTournament={roster.copyPreviousTournamentToMatchRoster}
          onCopyLastRoster={roster.copyLastRoster}
          onClear={roster.clearMatchRoster}
          onRemoveFromMatch={roster.removeFromMatchRoster}
          onMoveMatchPlayer={roster.moveMatchPlayer}
          onToggleGoalkeeper={roster.toggleMatchGoalkeeper}
          onToggleCaptain={roster.toggleMatchCaptain}
        />
      </div>
    </div>
  );
};