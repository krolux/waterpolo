import React from "react";
import type { MatchRoster, Player, RosterPlayer, TournamentRoster } from "../types/club";

export type SortMode = "number" | "lastName" | "birthYear" | "licenseStatus";

export type RosterPanelPlayer = RosterPlayer & {
  selectedForMatch: boolean;
  matchOrder: number | null;
};

const TOURNAMENT_LIMIT = 17;
const MATCH_LIMIT = 15;

function normalize(value: string) {
  return value.toLocaleLowerCase("pl-PL");
}

function licenseStatusRank(player: RosterPanelPlayer) {
  if (!player.licenseVerified) return 2;
  if (player.licenseValidUntil) {
    const diff = new Date(player.licenseValidUntil).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days <= 30) return 1;
  }
  return 0;
}

export function useRosterPanel(players: Player[]) {
  const [query, setQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("number");
  const [warning, setWarning] = React.useState<string | null>(null);

  const toRosterRow = React.useCallback((player: Player): RosterPanelPlayer => ({
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    gender: player.gender,
    birthYear: player.birthYear,
    licenseNumber: player.licenseNumber,
    defaultCapNumber: player.capNumber,
    loanFromClub: player.loanFromClub,
    loanClub: player.loanClub,
    licenseVerified: player.licenseVerified,
    licenseVerifiedAt: player.licenseVerifiedAt,
    licenseVerifiedBy: player.licenseVerifiedBy,
    licenseValidUntil: player.licenseValidUntil,
    tournamentCapNumber: player.capNumber,
    matchCapNumber: player.capNumber,
    isGoalkeeper: false,
    isCaptain: false,
    selectedForMatch: false,
    matchOrder: null,
  }), []);

  const [tournamentRoster, setTournamentRoster] = React.useState<RosterPanelPlayer[]>(() =>
    players.slice(0, Math.min(4, TOURNAMENT_LIMIT)).map((player) => toRosterRow(player))
  );

  const mockSources = React.useMemo(
    () => ({
      previousMatch: players.slice(0, 5).map((player, index) => ({
        ...toRosterRow(player),
        selectedForMatch: true,
        matchCapNumber: player.capNumber + 1,
        isGoalkeeper: index === 0,
        isCaptain: index === 1,
        matchOrder: index + 1,
      })),
      previousTournament: players.slice(0, 8).map((player, index) => ({
        ...toRosterRow(player),
        tournamentCapNumber: player.capNumber + index,
      })),
      lastRoster: players.slice(1, 7).map((player, index) => ({
        ...toRosterRow(player),
        selectedForMatch: true,
        matchCapNumber: player.capNumber + 2,
        isGoalkeeper: index < 2,
        isCaptain: index === 0,
        matchOrder: index + 1,
      })),
    }),
    [players, toRosterRow]
  );

  const sortPlayers = React.useCallback((rows: RosterPanelPlayer[]) => {
    const next = [...rows];
    next.sort((a, b) => {
      if (sortMode === "lastName") return a.lastName.localeCompare(b.lastName, "pl");
      if (sortMode === "birthYear") return a.birthYear - b.birthYear;
      if (sortMode === "licenseStatus") return licenseStatusRank(a) - licenseStatusRank(b);
      return a.tournamentCapNumber - b.tournamentCapNumber;
    });
    return next;
  }, [sortMode]);

  const tournamentRosterModel: TournamentRoster = React.useMemo(
    () => ({ tournamentId: "mock-tournament", clubName: "mock-club", players: tournamentRoster }),
    [tournamentRoster]
  );

  const matchRosterPlayers = React.useMemo(
    () => tournamentRoster.filter((player) => player.selectedForMatch),
    [tournamentRoster]
  );

  const matchRosterModel: MatchRoster = React.useMemo(
    () => ({ matchId: "mock-match", clubName: tournamentRosterModel.clubName, players: matchRosterPlayers }),
    [matchRosterPlayers, tournamentRosterModel.clubName]
  );

  const availableTournamentRoster = React.useMemo(
    () => tournamentRoster.filter((player) => !player.selectedForMatch),
    [tournamentRoster]
  );

  const filteredTournamentRoster = React.useMemo(() => {
    const q = normalize(query.trim());
    const rows = !q
      ? availableTournamentRoster
      : availableTournamentRoster.filter((player) => normalize(`${player.firstName} ${player.lastName} ${player.licenseNumber}`).includes(q));
    return sortPlayers(rows);
  }, [availableTournamentRoster, query, sortPlayers]);

  const filteredMatchRoster = React.useMemo(() => {
    const q = normalize(query.trim());
    const rows = !q
      ? matchRosterPlayers
      : matchRosterPlayers.filter((player) => normalize(`${player.firstName} ${player.lastName} ${player.licenseNumber}`).includes(q));
    return [...rows].sort((a, b) => (a.matchOrder ?? 999) - (b.matchOrder ?? 999));
  }, [matchRosterPlayers, query]);

  const tournamentLimitReached = tournamentRosterModel.players.length >= TOURNAMENT_LIMIT;
  const matchLimitReached = matchRosterModel.players.length >= MATCH_LIMIT;

  const addPlayersToTournamentRoster = React.useCallback(() => {
    setTournamentRoster((current) => {
      if (current.length >= TOURNAMENT_LIMIT) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return current;
      }
      const currentIds = new Set(current.map((player) => player.playerId));
      const remaining = players.filter((player) => !currentIds.has(player.id));
      if (remaining.length === 0) return current;
      const freeSlots = TOURNAMENT_LIMIT - current.length;
      const nextPlayers = remaining.slice(0, freeSlots).map((player) => toRosterRow(player));
      setWarning(null);
      return [...current, ...nextPlayers];
    });
  }, [players, toRosterRow]);

  const updateTournamentCapNumber = React.useCallback((playerId: string, value: string) => {
    const nextNumber = Number(value);
    setTournamentRoster((current) => current.map((player) => player.playerId !== playerId || Number.isNaN(nextNumber) ? player : { ...player, tournamentCapNumber: nextNumber }));
  }, []);

  const updateMatchCapNumber = React.useCallback((playerId: string, value: string) => {
    const nextNumber = Number(value);
    setTournamentRoster((current) => current.map((player) => player.playerId !== playerId || Number.isNaN(nextNumber) ? player : { ...player, matchCapNumber: nextNumber }));
  }, []);

  const toggleGoalkeeper = React.useCallback((playerId: string, checked: boolean) => {
    setTournamentRoster((current) => current.map((player) => player.playerId === playerId ? { ...player, isGoalkeeper: checked } : player));
  }, []);

  const toggleCaptain = React.useCallback((playerId: string, checked: boolean) => {
    setTournamentRoster((current) => current.map((player) => {
      if (player.playerId === playerId) return { ...player, isCaptain: checked };
      if (checked && player.selectedForMatch) return { ...player, isCaptain: false };
      return player;
    }));
  }, []);

  const addToMatchRoster = React.useCallback((playerId: string) => {
    setTournamentRoster((current) => {
      const currentSelected = current.filter((player) => player.selectedForMatch).length;
      if (currentSelected >= MATCH_LIMIT) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return current;
      }
      setWarning(null);
      return current.map((player) => player.playerId !== playerId ? player : { ...player, selectedForMatch: true, matchCapNumber: player.tournamentCapNumber, matchOrder: currentSelected + 1 });
    });
  }, []);

  const removeFromMatchRoster = React.useCallback((playerId: string) => {
    setTournamentRoster((current) => {
      const next = current.map((player) => player.playerId === playerId ? { ...player, selectedForMatch: false, matchOrder: null, isGoalkeeper: false, isCaptain: false } : player);
      const selected = next.filter((player) => player.selectedForMatch);
      const orderMap = new Map(selected.map((player, index) => [player.playerId, index + 1]));
      return next.map((player) => player.selectedForMatch ? { ...player, matchOrder: orderMap.get(player.playerId) ?? player.matchOrder } : player);
    });
    setWarning(null);
  }, []);

  const moveMatchPlayer = React.useCallback((playerId: string, direction: "up" | "down") => {
    setTournamentRoster((current) => {
      const selected = current.filter((player) => player.selectedForMatch).sort((a, b) => (a.matchOrder ?? 999) - (b.matchOrder ?? 999));
      const index = selected.findIndex((player) => player.playerId === playerId);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= selected.length) return current;
      const reordered = [...selected];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);
      const orderMap = new Map(reordered.map((player, idx) => [player.playerId, idx + 1]));
      return current.map((player) => player.selectedForMatch ? { ...player, matchOrder: orderMap.get(player.playerId) ?? player.matchOrder } : player);
    });
  }, []);

  const applyCopiedRoster = React.useCallback((source: RosterPanelPlayer[]) => {
    setTournamentRoster(source.slice(0, TOURNAMENT_LIMIT));
    setWarning(null);
  }, []);

  const copyPreviousMatchRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    applyCopiedRoster(mockSources.previousMatch);
  }, [applyCopiedRoster, mockSources.previousMatch]);

  const copyPreviousTournamentRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    const next = mockSources.previousTournament.map((player) => ({ ...player, selectedForMatch: false, matchCapNumber: player.tournamentCapNumber, isGoalkeeper: false, isCaptain: false, matchOrder: null }));
    applyCopiedRoster(next);
  }, [applyCopiedRoster, mockSources.previousTournament]);

  const copyLastRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    applyCopiedRoster(mockSources.lastRoster);
  }, [applyCopiedRoster, mockSources.lastRoster]);

  const clearTournamentRoster = React.useCallback(() => {
    if (!window.confirm("Czy wyczyścić skład?")) return;
    setTournamentRoster([]);
    setWarning(null);
  }, []);

  const clearMatchRoster = React.useCallback(() => {
    if (!window.confirm("Czy wyczyścić skład?")) return;
    setTournamentRoster((current) => current.map((player) => ({ ...player, selectedForMatch: false, matchCapNumber: player.tournamentCapNumber, isGoalkeeper: false, isCaptain: false, matchOrder: null })));
    setWarning(null);
  }, []);

  return {
    query,
    setQuery,
    sortMode,
    setSortMode,
    warning,
    tournamentLimitReached,
    matchLimitReached,
    tournamentCount: tournamentRosterModel.players.length,
    matchCount: matchRosterModel.players.length,
    filteredTournamentRoster,
    filteredMatchRoster,
    addPlayersToTournamentRoster,
    updateTournamentCapNumber,
    updateMatchCapNumber,
    toggleGoalkeeper,
    toggleCaptain,
    addToMatchRoster,
    removeFromMatchRoster,
    moveMatchPlayer,
    copyPreviousMatchRoster,
    copyPreviousTournamentRoster,
    copyLastRoster,
    clearTournamentRoster,
    clearMatchRoster,
  };
}