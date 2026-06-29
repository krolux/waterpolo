import React from "react";
import type { MatchRoster, Player, RosterPlayer, TournamentRoster } from "../types/club";

export type SortMode = "number" | "lastName" | "birthYear" | "licenseStatus";

export type RosterPanelPlayer = RosterPlayer;

export type RosterSlot = {
  slotNumber: number;
  player: RosterPanelPlayer | null;
};

type UseRosterPanelOptions = {
  maxBirthYear?: number;
  initialTournamentRosterPlayers?: RosterPanelPlayer[] | null;
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

export function useRosterPanel(players: Player[], options: UseRosterPanelOptions = {}) {
  const { maxBirthYear, initialTournamentRosterPlayers = null } = options;

  const [query, setQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("number");
  const [warning, setWarning] = React.useState<string | null>(null);

  const isEligible = React.useCallback(
    (player: Player | RosterPanelPlayer) => (typeof maxBirthYear === "number" ? player.birthYear >= maxBirthYear : true),
    [maxBirthYear]
  );

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

  const eligiblePlayers = React.useMemo(
    () => players.filter((player) => isEligible(player)),
    [isEligible, players]
  );

  const eligiblePlayersById = React.useMemo(() => {
    const map = new Map<string, Player>();
    eligiblePlayers.forEach((player) => map.set(player.id, player));
    return map;
  }, [eligiblePlayers]);

  const [tournamentSlots, setTournamentSlots] = React.useState<RosterSlot[]>(() => createEmptySlots(TOURNAMENT_LIMIT));

  const [matchSlots, setMatchSlots] = React.useState<RosterSlot[]>(() => createEmptySlots(MATCH_LIMIT));

  React.useEffect(() => {
    setTournamentSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (!slot.player) return slot;
        return eligiblePlayersById.has(slot.player.playerId) ? slot : { ...slot, player: null };
      })
    );
    setMatchSlots((currentSlots) =>
      currentSlots.map((slot) => {
        if (!slot.player) return slot;
        return eligiblePlayersById.has(slot.player.playerId) ? slot : { ...slot, player: null };
      })
    );
  }, [eligiblePlayersById]);

  React.useEffect(() => {
    if (initialTournamentRosterPlayers === null) {
      return;
    }

    const nextSlots = createEmptySlots(TOURNAMENT_LIMIT);
    initialTournamentRosterPlayers.forEach((player) => {
      const slotIndex = clampIndex((player.tournamentCapNumber || 1) - 1, TOURNAMENT_LIMIT);
      nextSlots[slotIndex] = {
        ...nextSlots[slotIndex],
        player: {
          ...player,
          tournamentCapNumber: slotIndex + 1,
        },
      };
    });

    setTournamentSlots(nextSlots);
  }, [initialTournamentRosterPlayers]);

  const mockSources = React.useMemo(
    () => ({
      previousMatch: eligiblePlayers.slice(0, 5).map((player, index) => ({
        ...toRosterRow(player),
        matchCapNumber: index + 1,
        isGoalkeeper: index === 0,
        isCaptain: index === 1,
      })),
      previousTournament: eligiblePlayers.slice(0, 8).map((player, index) => ({
        ...toRosterRow(player),
        tournamentCapNumber: index + 1,
      })),
      lastRoster: eligiblePlayers.slice(1, 7).map((player, index) => ({
        ...toRosterRow(player),
        matchCapNumber: index + 1,
        isGoalkeeper: index < 2,
        isCaptain: index === 0,
      })),
    }),
    [eligiblePlayers, toRosterRow]
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

  const filterAndSort = React.useCallback((rows: RosterPanelPlayer[]) => {
    const q = normalize(query.trim());
    const filtered = !q
      ? rows
      : rows.filter((player) => normalize(`${player.firstName} ${player.lastName} ${player.licenseNumber}`).includes(q));
    return sortPlayers(filtered);
  }, [query, sortPlayers]);

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

  const tournamentIds = React.useMemo(
    () => new Set(tournamentRosterPlayers.map((player) => player.playerId)),
    [tournamentRosterPlayers]
  );

  const matchIds = React.useMemo(
    () => new Set(matchRosterPlayers.map((player) => player.playerId)),
    [matchRosterPlayers]
  );

  const clubPlayersForTournament = React.useMemo(
    () => filterAndSort(eligiblePlayers.filter((player) => !tournamentIds.has(player.id)).map((player) => toRosterRow(player))),
    [eligiblePlayers, filterAndSort, toRosterRow, tournamentIds]
  );

  const clubPlayersForMatch = React.useMemo(
    () => filterAndSort(eligiblePlayers.filter((player) => !matchIds.has(player.id)).map((player) => toRosterRow(player))),
    [eligiblePlayers, filterAndSort, matchIds, toRosterRow]
  );

  const tournamentPlayersForMatch = React.useMemo(
    () => filterAndSort(tournamentRosterPlayers.filter((player) => !matchIds.has(player.playerId) && isEligible(player))),
    [filterAndSort, isEligible, matchIds, tournamentRosterPlayers]
  );

  const tournamentLimitReached = tournamentRosterModel.players.length >= TOURNAMENT_LIMIT;
  const matchLimitReached = matchRosterModel.players.length >= MATCH_LIMIT;

  const addPlayersToTournamentRoster = React.useCallback(() => {
    setTournamentSlots((currentSlots) => {
      const currentCount = currentSlots.filter((slot) => !!slot.player).length;
      if (currentCount >= TOURNAMENT_LIMIT) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return currentSlots;
      }

      const remaining = clubPlayersForTournament;
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
  }, [clubPlayersForTournament]);

  const addPlayerToTournamentRoster = React.useCallback((playerId: string) => {
    const player = clubPlayersForTournament.find((item) => item.playerId === playerId);
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
  }, [clubPlayersForTournament]);

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

  const addMatchPlayer = React.useCallback((player: RosterPanelPlayer, preferredIndex?: number) => {
    setMatchSlots((currentSlots) => {
      if (currentSlots.some((slot) => slot.player?.playerId === player.playerId)) return currentSlots;

      const currentSelected = currentSlots.filter((slot) => !!slot.player).length;
      if (currentSelected >= MATCH_LIMIT) {
        setWarning("Osiągnięto maksymalny limit zawodników.");
        return currentSlots;
      }

      const preferred = typeof preferredIndex === "number" && preferredIndex >= 0 && preferredIndex < MATCH_LIMIT
        ? preferredIndex
        : -1;
      const targetIndex = preferred >= 0 && !currentSlots[preferred].player
        ? preferred
        : findFirstFreeSlotIndex(currentSlots);
      if (targetIndex < 0) return currentSlots;

      const next = currentSlots.map((slot) => ({ ...slot, player: slot.player ? { ...slot.player } : null }));
      next[targetIndex] = {
        ...next[targetIndex],
        player: {
          ...player,
          matchCapNumber: targetIndex + 1,
          isGoalkeeper: false,
          isCaptain: false,
        },
      };
      setWarning(null);
      return next;
    });
  }, []);

  const addTournamentPlayerToMatchRoster = React.useCallback((playerId: string) => {
    const tournamentIndex = tournamentSlots.findIndex((slot) => slot.player?.playerId === playerId);
    const sourcePlayer = tournamentIndex >= 0 ? tournamentSlots[tournamentIndex].player : null;
    if (!sourcePlayer) return;
    addMatchPlayer(sourcePlayer);
  }, [addMatchPlayer, tournamentSlots]);

  const addClubPlayerToMatchRoster = React.useCallback((playerId: string) => {
    const basePlayer = eligiblePlayersById.get(playerId);
    if (!basePlayer) return;
    addMatchPlayer(toRosterRow(basePlayer));
  }, [addMatchPlayer, eligiblePlayersById, toRosterRow]);

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
    applyCopiedMatchRoster(mockSources.previousMatch);
  }, [applyCopiedMatchRoster, mockSources.previousMatch]);

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
    applyCopiedMatchRoster(next);
  }, [applyCopiedMatchRoster, mockSources.previousTournament]);

  const copyLastRoster = React.useCallback(() => {
    if (!window.confirm("Czy skopiować skład?")) return;
    applyCopiedMatchRoster(mockSources.lastRoster);
  }, [applyCopiedMatchRoster, mockSources.lastRoster]);

  const clearTournamentRoster = React.useCallback(() => {
    if (!window.confirm("Czy wyczyścić skład?")) return;
    setTournamentSlots(createEmptySlots(TOURNAMENT_LIMIT));
    setWarning(null);
  }, []);

  const clearMatchRoster = React.useCallback(() => {
    if (!window.confirm("Czy wyczyścić skład?")) return;
    setMatchSlots(createEmptySlots(MATCH_LIMIT));
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
    clubPlayersForTournament,
    clubPlayersForMatch,
    tournamentPlayersForMatch,
    tournamentSlots,
    matchSlots,
    addPlayersToTournamentRoster,
    addPlayerToTournamentRoster,
    removeFromTournamentRoster,
    toggleTournamentGoalkeeper,
    toggleMatchGoalkeeper,
    toggleTournamentCaptain,
    toggleMatchCaptain,
    addTournamentPlayerToMatchRoster,
    addClubPlayerToMatchRoster,
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
