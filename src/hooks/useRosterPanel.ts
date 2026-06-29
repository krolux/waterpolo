import React from "react";
import type { MatchRoster, Player, RosterPlayer, TournamentRoster } from "../types/club";

export type SortMode = "number" | "lastName" | "birthYear" | "licenseStatus";

export type RosterPanelPlayer = RosterPlayer;

export type RosterSlot = {
  slotNumber: number;
  player: RosterPanelPlayer | null;
};

const TOURNAMENT_LIMIT = 17;
const MATCH_LIMIT = 15;

function normalize(value: string) {
  return value.toLocaleLowerCase("pl-PL");
}

function clampIndex(index: number, max: number) {
  return Math.max(0, Math.min(index, max - 1));
}

function createEmptySlots(limit: number): RosterSlot[] {
  return Array.from({ length: limit }, (_, index) => ({
    slotNumber: index + 1,
    player: null,
  }));
}

function findFirstFreeSlotIndex(slots: RosterSlot[]) {
  return slots.findIndex((slot) => !slot.player);
}

function placePlayersIntoSlots(
  currentSlots: RosterSlot[],
  sourcePlayers: RosterPanelPlayer[],
  getPreferredIndex: (player: RosterPanelPlayer) => number,
  limit: number,
  capField: "tournamentCapNumber" | "matchCapNumber"
) {
  const nextSlots = currentSlots.map((slot) => ({
    ...slot,
    player: slot.player ? { ...slot.player } : null,
  }));

  for (const sourcePlayer of sourcePlayers) {
    const alreadyPlacedIndex = nextSlots.findIndex((slot) => slot.player?.playerId === sourcePlayer.playerId);
    if (alreadyPlacedIndex >= 0) continue;

    const preferredIndex = clampIndex(getPreferredIndex(sourcePlayer), limit);
    const targetIndex = !nextSlots[preferredIndex].player
      ? preferredIndex
      : findFirstFreeSlotIndex(nextSlots);
    if (targetIndex < 0) break;

    nextSlots[targetIndex] = {
      ...nextSlots[targetIndex],
      player: {
        ...sourcePlayer,
        [capField]: targetIndex + 1,
      },
    };
  }

  return nextSlots;
}

function swapSlots(
  slots: RosterSlot[],
  fromIndex: number,
  toIndex: number,
  capField: "tournamentCapNumber" | "matchCapNumber"
) {
  const next = slots.map((slot) => ({
    ...slot,
    player: slot.player ? { ...slot.player } : null,
  }));

  const temp = next[fromIndex].player;
  next[fromIndex].player = next[toIndex].player;
  next[toIndex].player = temp;

  if (next[fromIndex].player) {
    next[fromIndex].player = { ...next[fromIndex].player, [capField]: fromIndex + 1 };
  }
  if (next[toIndex].player) {
    next[toIndex].player = { ...next[toIndex].player, [capField]: toIndex + 1 };
  }

  return next;
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
  }), []);

  const [tournamentSlots, setTournamentSlots] = React.useState<RosterSlot[]>(() => {
    const slots = createEmptySlots(TOURNAMENT_LIMIT);
    players.slice(0, Math.min(4, TOURNAMENT_LIMIT)).forEach((player, index) => {
      slots[index] = {
        ...slots[index],
        player: {
          ...toRosterRow(player),
          tournamentCapNumber: index + 1,
        },
      };
    });
    return slots;
  });

  const [matchSlots, setMatchSlots] = React.useState<RosterSlot[]>(() => createEmptySlots(MATCH_LIMIT));

  const mockSources = React.useMemo(
    () => ({
      previousMatch: players.slice(0, 5).map((player, index) => ({
        ...toRosterRow(player),
        matchCapNumber: index + 1,
        isGoalkeeper: index === 0,
        isCaptain: index === 1,
      })),
      previousTournament: players.slice(0, 8).map((player, index) => ({
        ...toRosterRow(player),
        tournamentCapNumber: index + 1,
      })),
      lastRoster: players.slice(1, 7).map((player, index) => ({
        ...toRosterRow(player),
        matchCapNumber: index + 1,
        isGoalkeeper: index < 2,
        isCaptain: index === 0,
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
      return a.defaultCapNumber - b.defaultCapNumber;
    });
    return next;
  }, [sortMode]);

  const tournamentRosterPlayers = React.useMemo(
    () => tournamentSlots.map((slot) => slot.player).filter((player): player is RosterPanelPlayer => !!player),
    [tournamentSlots]
  );

  const matchRosterPlayers = React.useMemo(
    () => matchSlots.map((slot) => slot.player).filter((player): player is RosterPanelPlayer => !!player),
    [matchSlots]
  );

  const tournamentRosterModel: TournamentRoster = React.useMemo(
    () => ({ tournamentId: "mock-tournament", clubName: "mock-club", players: tournamentRosterPlayers }),
    [tournamentRosterPlayers]
  );

  const matchRosterModel: MatchRoster = React.useMemo(
    () => ({ matchId: "mock-match", clubName: tournamentRosterModel.clubName, players: matchRosterPlayers }),
    [matchRosterPlayers, tournamentRosterModel.clubName]
  );

  const availableTournamentPlayers = React.useMemo(
    () => {
      const selectedIds = new Set(tournamentRosterPlayers.map((player) => player.playerId));
      return players
        .filter((player) => !selectedIds.has(player.id))
        .map((player) => toRosterRow(player));
    },
    [players, toRosterRow, tournamentRosterPlayers]
  );

  const filteredAvailableTournamentPlayers = React.useMemo(() => {
    const q = normalize(query.trim());
    const rows = !q
      ? availableTournamentPlayers
      : availableTournamentPlayers.filter((player) => normalize(`${player.firstName} ${player.lastName} ${player.licenseNumber}`).includes(q));
    return sortPlayers(rows);
  }, [availableTournamentPlayers, query, sortPlayers]);

  const tournamentLimitReached = tournamentRosterModel.players.length >= TOURNAMENT_LIMIT;
  const matchLimitReached = matchRosterModel.players.length >= MATCH_LIMIT;

  const addPlayersToTournamentRoster = React.useCallback(() => {
    setTournamentSlots((currentSlots) => {
      const currentCount = currentSlots.filter((slot) => !!slot.player).length;
      if (currentCount >= TOURNAMENT_LIMIT) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return currentSlots;
      }

      const currentIds = new Set(
        currentSlots
          .map((slot) => slot.player?.playerId)
          .filter((value): value is string => !!value)
      );

      const remaining = filteredAvailableTournamentPlayers.filter((player) => !currentIds.has(player.playerId));
      if (remaining.length === 0) return currentSlots;

      const next = currentSlots.map((slot) => ({ ...slot, player: slot.player ? { ...slot.player } : null }));
      const freeSlots = TOURNAMENT_LIMIT - currentCount;

      for (const player of remaining.slice(0, freeSlots)) {
        const freeIndex = findFirstFreeSlotIndex(next);
        if (freeIndex < 0) break;
        next[freeIndex] = {
          ...next[freeIndex],
          player: {
            ...player,
            tournamentCapNumber: freeIndex + 1,
          },
        };
      }

      setWarning(null);
      return next;
    });
  }, [filteredAvailableTournamentPlayers]);

  const addPlayerToTournamentRoster = React.useCallback((playerId: string) => {
    const player = filteredAvailableTournamentPlayers.find((item) => item.playerId === playerId);
    if (!player) return;

    setTournamentSlots((currentSlots) => {
      if (currentSlots.some((slot) => slot.player?.playerId === playerId)) return currentSlots;

      const freeIndex = findFirstFreeSlotIndex(currentSlots);
      if (freeIndex < 0) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return currentSlots;
      }

      const next = currentSlots.map((slot) => ({ ...slot, player: slot.player ? { ...slot.player } : null }));
      next[freeIndex] = {
        ...next[freeIndex],
        player: {
          ...player,
          tournamentCapNumber: freeIndex + 1,
        },
      };

      setWarning(null);
      return next;
    });
  }, [filteredAvailableTournamentPlayers]);

  const toggleTournamentGoalkeeper = React.useCallback((playerId: string, checked: boolean) => {
    setTournamentSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.player?.playerId === playerId
          ? { ...slot, player: { ...slot.player, isGoalkeeper: checked } }
          : slot
      )
    );
  }, []);

  const toggleMatchGoalkeeper = React.useCallback((playerId: string, checked: boolean) => {
    setMatchSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.player?.playerId === playerId
          ? { ...slot, player: { ...slot.player, isGoalkeeper: checked } }
          : slot
      )
    );
  }, []);

  const toggleTournamentCaptain = React.useCallback((playerId: string, checked: boolean) => {
    setTournamentSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (!slot.player) return slot;
        if (slot.player.playerId === playerId) {
          return { ...slot, player: { ...slot.player, isCaptain: checked } };
        }
        if (checked) {
          return { ...slot, player: { ...slot.player, isCaptain: false } };
        }
        return slot;
      })
    );
  }, []);

  const toggleMatchCaptain = React.useCallback((playerId: string, checked: boolean) => {
    setMatchSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (!slot.player) return slot;
        if (slot.player.playerId === playerId) {
          return { ...slot, player: { ...slot.player, isCaptain: checked } };
        }
        if (checked) {
          return { ...slot, player: { ...slot.player, isCaptain: false } };
        }
        return slot;
      })
    );
  }, []);

  const addToMatchRoster = React.useCallback((playerId: string) => {
    const tournamentIndex = tournamentSlots.findIndex((slot) => slot.player?.playerId === playerId);
    const tournamentPlayer = tournamentIndex >= 0 ? tournamentSlots[tournamentIndex].player : null;
    if (!tournamentPlayer) return;

    setMatchSlots((currentSlots) => {
      if (currentSlots.some((slot) => slot.player?.playerId === playerId)) return currentSlots;

      const currentSelected = currentSlots.filter((slot) => !!slot.player).length;
      if (currentSelected >= MATCH_LIMIT) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return currentSlots;
      }

      const preferredIndex = tournamentIndex < MATCH_LIMIT ? tournamentIndex : -1;
      const targetIndex = preferredIndex >= 0 && !currentSlots[preferredIndex].player
        ? preferredIndex
        : findFirstFreeSlotIndex(currentSlots);
      if (targetIndex < 0) return currentSlots;

      setWarning(null);
      return currentSlots.map((slot, index) => {
        if (index !== targetIndex) return slot;
        return {
          ...slot,
          player: {
            ...tournamentPlayer,
            matchCapNumber: targetIndex + 1,
            isGoalkeeper: false,
            isCaptain: false,
          },
        };
      });
    });
  }, [tournamentSlots]);

  const removeFromMatchRoster = React.useCallback((playerId: string) => {
    setMatchSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.player?.playerId === playerId
          ? { ...slot, player: null }
          : slot
      )
    );
    setWarning(null);
  }, []);

  const removeFromTournamentRoster = React.useCallback((playerId: string) => {
    setTournamentSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.player?.playerId === playerId
          ? { ...slot, player: null }
          : slot
      )
    );
    setMatchSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.player?.playerId === playerId
          ? { ...slot, player: null }
          : slot
      )
    );
    setWarning(null);
  }, []);

  const moveTournamentPlayer = React.useCallback((playerId: string, direction: "up" | "down") => {
    setTournamentSlots((currentSlots) => {
      const index = currentSlots.findIndex((slot) => slot.player?.playerId === playerId);
      if (index < 0) return currentSlots;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= TOURNAMENT_LIMIT) return currentSlots;

      return swapSlots(currentSlots, index, targetIndex, "tournamentCapNumber");
    });
  }, []);

  const moveMatchPlayer = React.useCallback((playerId: string, direction: "up" | "down") => {
    setMatchSlots((currentSlots) => {
      const index = currentSlots.findIndex((slot) => slot.player?.playerId === playerId);
      if (index < 0) return currentSlots;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= MATCH_LIMIT) return currentSlots;

      return swapSlots(currentSlots, index, targetIndex, "matchCapNumber");
    });
  }, []);

  const applyCopiedTournamentRoster = React.useCallback((source: RosterPanelPlayer[]) => {
    setTournamentSlots((currentSlots) => placePlayersIntoSlots(
      currentSlots,
      source,
      (player) => Math.max(0, player.tournamentCapNumber - 1),
      TOURNAMENT_LIMIT,
      "tournamentCapNumber"
    ));
    setWarning(null);
  }, []);

  const applyCopiedMatchRoster = React.useCallback((source: RosterPanelPlayer[]) => {
    setMatchSlots((currentSlots) => placePlayersIntoSlots(
      currentSlots,
      source,
      (player) => Math.max(0, player.matchCapNumber - 1),
      MATCH_LIMIT,
      "matchCapNumber"
    ));
    setWarning(null);
  }, []);

  const copyPreviousMatchRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    applyCopiedTournamentRoster(mockSources.previousMatch);
    applyCopiedMatchRoster(mockSources.previousMatch);
  }, [applyCopiedMatchRoster, applyCopiedTournamentRoster, mockSources.previousMatch]);

  const copyPreviousTournamentRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    applyCopiedTournamentRoster(mockSources.previousTournament);
  }, [applyCopiedTournamentRoster, mockSources.previousTournament]);

  const copyPreviousTournamentToMatchRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    const next = mockSources.previousTournament.map((player) => ({
      ...player,
      matchCapNumber: player.tournamentCapNumber,
      isGoalkeeper: false,
      isCaptain: false,
    }));
    applyCopiedTournamentRoster(next);
    applyCopiedMatchRoster(next);
  }, [applyCopiedMatchRoster, applyCopiedTournamentRoster, mockSources.previousTournament]);

  const copyLastRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    applyCopiedTournamentRoster(mockSources.lastRoster);
    applyCopiedMatchRoster(mockSources.lastRoster);
  }, [applyCopiedMatchRoster, applyCopiedTournamentRoster, mockSources.lastRoster]);

  const clearTournamentRoster = React.useCallback(() => {
    if (!window.confirm("Czy wyczyścić skład?")) return;
    setTournamentSlots(createEmptySlots(TOURNAMENT_LIMIT));
    setMatchSlots(createEmptySlots(MATCH_LIMIT));
    setWarning(null);
  }, []);

  const clearMatchRoster = React.useCallback(() => {
    if (!window.confirm("Czy wyczyścić skład?")) return;
    setMatchSlots(createEmptySlots(MATCH_LIMIT));
    setWarning(null);
  }, []);

  const filteredTournamentSlots = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return tournamentSlots;
    return tournamentSlots.map((slot) => {
      if (!slot.player) return slot;
      const haystack = normalize(`${slot.player.firstName} ${slot.player.lastName} ${slot.player.licenseNumber}`);
      return haystack.includes(q) ? slot : { ...slot, player: null };
    });
  }, [query, tournamentSlots]);

  const filteredMatchSlots = React.useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return matchSlots;
    return matchSlots.map((slot) => {
      if (!slot.player) return slot;
      const haystack = normalize(`${slot.player.firstName} ${slot.player.lastName} ${slot.player.licenseNumber}`);
      return haystack.includes(q) ? slot : { ...slot, player: null };
    });
  }, [query, matchSlots]);

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
    availablePlayers: filteredAvailableTournamentPlayers,
    tournamentSlots: filteredTournamentSlots,
    matchSlots: filteredMatchSlots,
    addPlayersToTournamentRoster,
    addPlayerToTournamentRoster,
    removeFromTournamentRoster,
    toggleTournamentGoalkeeper,
    toggleMatchGoalkeeper,
    toggleTournamentCaptain,
    toggleMatchCaptain,
    addToMatchRoster,
    removeFromMatchRoster,
    moveTournamentPlayer,
    moveMatchPlayer,
    copyPreviousMatchRoster,
    copyPreviousTournamentRoster,
    copyPreviousTournamentToMatchRoster,
    copyLastRoster,
    clearTournamentRoster,
    clearMatchRoster,
  };
}