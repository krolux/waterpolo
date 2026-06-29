import React from "react";
import { MatchRosterPanel } from "./MatchRosterPanel";
import { RosterSearch } from "./RosterSearch";
import { RosterSourcePanel } from "./RosterSourcePanel";
import { TournamentRosterPanel } from "./TournamentRosterPanel";
import { useRosterPanel } from "../../hooks/useRosterPanel";
import {
  getMatchRoster,
  getTournamentRoster,
  saveMatchRoster,
  saveTournamentRoster,
  type MatchRosterWithPlayers,
  type TournamentRosterWithPlayers,
} from "../../lib/rosters";
import { supabase } from "../../lib/supabase";
import type { Player } from "../../types/club";
import { resolveRosterLicenseStatus, type SaveRosterPayload } from "../../types/rosters";

export type RosterContext =
  | {
      mode: "tournament";
      matchId: string;
      home?: string;
      away: string;
      date: string;
      time?: string;
      location: string;
      targetDate?: string;
      tournamentId?: string;
      tournamentName?: string;
      maxBirthYear?: number;
    }
  | {
      mode: "match";
      matchId: string;
      home: string;
      away: string;
      date: string;
      time?: string;
      location: string;
      targetDate?: string;
      tournamentId?: string;
      tournamentName?: string;
      maxBirthYear?: number;
    };

type RosterPanelProps = {
  message?: string;
  players?: Player[];
  context?: RosterContext | null;
  onBack?: () => void;
  clubName?: string;
  clubId?: string | null;
  canSaveRoster?: boolean;
  onSaveRoster?: (payload: SaveRosterPayload) => void;
};

export const RosterPanel: React.FC<RosterPanelProps> = ({
  message = "Brak zgłoszonego składu.",
  players = [],
  context = null,
  onBack,
  clubName,
  clubId = null,
  canSaveRoster = true,
  onSaveRoster,
}) => {
  const [loadedTournamentRoster, setLoadedTournamentRoster] = React.useState<TournamentRosterWithPlayers | null>(null);
  const [loadedMatchRoster, setLoadedMatchRoster] = React.useState<MatchRosterWithPlayers | null>(null);
  const [rosterLoading, setRosterLoading] = React.useState(false);
  const [rosterError, setRosterError] = React.useState<string | null>(null);
  const initialTournamentRosterPlayers = React.useMemo(
    () => (loadedTournamentRoster ? mapTournamentRosterPlayers(loadedTournamentRoster) : null),
    [loadedTournamentRoster?.id, loadedTournamentRoster?.updated_at, loadedTournamentRoster?.players.length]
  );
  const initialMatchRosterPlayers = React.useMemo(
    () => (loadedMatchRoster ? mapMatchRosterPlayers(loadedMatchRoster) : null),
    [loadedMatchRoster?.id, loadedMatchRoster?.updated_at, loadedMatchRoster?.players.length]
  );
  const roster = useRosterPanel(players, {
    maxBirthYear: context?.maxBirthYear,
    initialTournamentRosterPlayers: context ? initialTournamentRosterPlayers : null,
    initialMatchRosterPlayers: context ? initialMatchRosterPlayers : null,
  });
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const isTournamentMode = context?.mode === "tournament";
  const isTournamentMatch = context?.mode === "match" && !!context?.tournamentId;
  const currentContext = context;
  const targetDate = currentContext?.targetDate || currentContext?.date;
  const headerTitle = !currentContext
    ? ""
    : isTournamentMode
      ? `Zgłoszenie do turnieju: ${currentContext.tournamentName || "Turniej"}`
      : `Lista startowa meczu: ${(currentContext.mode === "match" ? currentContext.home : "") } vs ${(currentContext.mode === "match" ? currentContext.away : "")}`;
  const matchSubtitle = currentContext ? `${new Date(currentContext.date).toLocaleDateString("pl-PL")} • ${currentContext.location}` : "";
  const tournamentRosterMissing = !!currentContext && isTournamentMatch && !rosterLoading && (!loadedTournamentRoster || loadedTournamentRoster.players.length === 0);

  const handleClear = () => {
    if (isTournamentMode) {
      roster.clearTournamentRoster();
      return;
    }
    roster.clearMatchRoster();
  };

  React.useEffect(() => {
    let isActive = true;

    setRosterLoading(true);
    setRosterError(null);
    setLoadedTournamentRoster(null);
    setLoadedMatchRoster(null);

    if (!currentContext || !clubId) {
      setRosterLoading(false);
      return;
    }

    (async () => {
      try {
        const [tournamentRoster, matchRoster] = await Promise.all([
          currentContext.tournamentId ? getTournamentRoster(currentContext.tournamentId, clubId) : Promise.resolve(null),
          currentContext.mode === "match" ? getMatchRoster(currentContext.matchId, clubId) : Promise.resolve(null),
        ]);

        if (!isActive) return;

        setLoadedTournamentRoster(tournamentRoster);
        setLoadedMatchRoster(matchRoster);
      } catch {
        if (!isActive) return;
        setRosterError("Nie udało się pobrać listy meczowej.");
      } finally {
        if (!isActive) return;
        setRosterLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [clubId, currentContext?.matchId, currentContext?.mode, currentContext?.tournamentId]);

  const handleSave = async () => {
    if (!canSaveRoster) {
      setSaveError("Brak uprawnień do zapisu składu.");
      return;
    }

    if (!currentContext) {
      return;
    }

    setSaveMessage(null);
    setSaveError(null);

    try {
      if (isTournamentMode) {
        const sourceSlots = roster.tournamentSlots;
        const payloadPlayers = sourceSlots
          .filter((slot) => !!slot.player)
          .map((slot) => {
            const player = slot.player!;
            return {
              slot: slot.slotNumber,
              playerId: player.playerId,
              displayOrder: slot.slotNumber,
              fullName: `${player.firstName} ${player.lastName}`,
              birthYear: player.birthYear,
              isGoalkeeper: !!player.isGoalkeeper,
              isCaptain: !!player.isCaptain,
              licenseNumber: player.licenseNumber,
              loanClub: player.loanClub || player.loanFromClub || null,
              licenseValidUntil: player.licenseValidUntil || null,
              licenseStatus: resolveRosterLicenseStatus(player.licenseValidUntil, targetDate),
            };
          });

        const { data: authData } = await supabase.auth.getUser();
        let submittedByName: string | null = null;
        if (authData.user?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", authData.user.id)
            .maybeSingle();
          submittedByName = profileData?.display_name || authData.user.email || null;
        }

        const payload: SaveRosterPayload = {
          mode: currentContext.mode,
          clubName: clubName || "Nieznany klub",
          tournamentId: currentContext.tournamentId,
          submittedByProfileId: authData.user?.id || null,
          submittedByName,
          players: payloadPlayers,
          savedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!currentContext.tournamentId || !clubId) {
          setSaveError("Brak danych do zapisu listy turniejowej.");
          return;
        }

        const savedRoster = await saveTournamentRoster({
          tournamentId: currentContext.tournamentId,
          clubId,
          submittedByProfileId: payload.submittedByProfileId,
          submittedByName: payload.submittedByName,
          players: payloadPlayers.map((player) => ({
            playerId: player.playerId,
            slot: player.slot,
            displayOrder: player.displayOrder,
          })),
        });

        setLoadedTournamentRoster(savedRoster);
        onSaveRoster?.(payload);
        setSaveMessage("Lista turniejowa zapisana.");
        return;
      }

      const sourceSlots = roster.matchSlots;
      const payloadPlayers = sourceSlots
        .filter((slot) => !!slot.player)
        .map((slot) => {
          const player = slot.player!;
          return {
            slot: slot.slotNumber,
            playerId: player.playerId,
            fullName: `${player.firstName} ${player.lastName}`,
            birthYear: player.birthYear,
            isGoalkeeper: !!player.isGoalkeeper,
            isCaptain: !!player.isCaptain,
            licenseNumber: player.licenseNumber,
            loanClub: player.loanClub || player.loanFromClub || null,
            licenseValidUntil: player.licenseValidUntil || null,
            licenseStatus: resolveRosterLicenseStatus(player.licenseValidUntil, targetDate),
          };
        });

      if (currentContext.mode === "match") {
        const matchPlayerCount = payloadPlayers.length;
        const goalkeeperCount = payloadPlayers.filter((player) => player.isGoalkeeper).length;
        const captainCount = payloadPlayers.filter((player) => player.isCaptain).length;

        if (matchPlayerCount > 15) {
          setSaveError("Lista meczowa nie może mieć więcej niż 15 zawodników.");
          return;
        }
        if (goalkeeperCount > 2) {
          setSaveError("Lista meczowa może mieć maksymalnie 2 bramkarzy.");
          return;
        }
        if (matchPlayerCount > 0 && captainCount !== 1) {
          setSaveError("Lista meczowa musi mieć dokładnie 1 kapitana.");
          return;
        }

        if (currentContext.tournamentId && (!loadedTournamentRoster || loadedTournamentRoster.players.length === 0)) {
          setSaveError("Najpierw wyślij listę turniejową.");
          return;
        }

        const { data: authData } = await supabase.auth.getUser();
        let submittedByName: string | null = null;
        if (authData.user?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", authData.user.id)
            .maybeSingle();
          submittedByName = profileData?.display_name || authData.user.email || null;
        }

        const savedMatchRoster = await saveMatchRoster({
          matchId: currentContext.matchId,
          clubId,
          tournamentRosterId: loadedTournamentRoster?.id || null,
          submittedByProfileId: authData.user?.id || null,
          submittedByName,
          players: payloadPlayers.map((player) => ({
            playerId: player.playerId,
            slot: player.slot,
            isGoalkeeper: player.isGoalkeeper,
            isCaptain: player.isCaptain,
          })),
        });

        setLoadedMatchRoster(savedMatchRoster);
        const payload: SaveRosterPayload = {
          mode: currentContext.mode,
          clubName: clubName || "Nieznany klub",
          matchId: currentContext.matchId,
          tournamentId: currentContext.tournamentId,
          submittedByProfileId: authData.user?.id || null,
          submittedByName,
          players: payloadPlayers,
          savedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onSaveRoster?.(payload);
        setSaveMessage("Lista meczowa zapisana.");
        return;
      }

      const payload: SaveRosterPayload = {
        mode: currentContext.mode,
        clubName: clubName || "Nieznany klub",
        tournamentId: currentContext.tournamentId,
        submittedByProfileId: undefined,
        submittedByName: undefined,
        players: payloadPlayers,
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSaveRoster?.(payload);
      setSaveMessage("Skład zapisany.");
    } catch {
      setSaveError(currentContext.mode === "match" ? "Nie udało się zapisać listy meczowej." : "Nie udało się zapisać listy turniejowej.");
    }
  };

  function mapTournamentRosterPlayers(roster: TournamentRosterWithPlayers) {
    return roster.players.map((entry) => ({
      playerId: entry.player.id,
      firstName: entry.player.first_name,
      lastName: entry.player.last_name,
      gender: entry.player.gender,
      birthYear: entry.player.birth_year,
      licenseNumber: entry.player.license_number,
      defaultCapNumber: entry.player.default_cap_number ?? 0,
      loanFromClub: entry.player.loan_club_name || undefined,
      loanClub: entry.player.loan_club_name || undefined,
      licenseVerified: !!entry.player.license_verified_until,
      licenseVerifiedAt: entry.player.license_verified_until || undefined,
      licenseVerifiedBy: undefined,
      licenseValidUntil: entry.player.license_verified_until || undefined,
      tournamentCapNumber: entry.slot,
      matchCapNumber: entry.slot,
      isGoalkeeper: false,
      isCaptain: false,
    }));
  }

  function mapMatchRosterPlayers(roster: MatchRosterWithPlayers) {
    return roster.players.map((entry) => ({
      playerId: entry.player.id,
      firstName: entry.player.first_name,
      lastName: entry.player.last_name,
      gender: entry.player.gender,
      birthYear: entry.player.birth_year,
      licenseNumber: entry.player.license_number,
      defaultCapNumber: entry.player.default_cap_number ?? 0,
      loanFromClub: entry.player.loan_club_name || undefined,
      loanClub: entry.player.loan_club_name || undefined,
      licenseVerified: !!entry.player.license_verified_until,
      licenseVerifiedAt: entry.player.license_verified_until || undefined,
      licenseVerifiedBy: undefined,
      licenseValidUntil: entry.player.license_verified_until || undefined,
      tournamentCapNumber: entry.slot,
      matchCapNumber: entry.slot,
      isGoalkeeper: entry.is_goalkeeper,
      isCaptain: entry.is_captain,
    }));
  }

  if (!context) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-3 text-sm text-slate-500">
        Wybierz mecz lub turniej z kart powyżej, aby otworzyć panel tworzenia listy startowej.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
      <div className="space-y-2 border-b border-slate-200 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-slate-800">{headerTitle}</div>
            {isTournamentMode ? (
              <div className="text-sm text-slate-600">Maksymalnie 17 zawodników</div>
            ) : (
              <>
                <div className="text-sm text-slate-600">{matchSubtitle}</div>
                {context.tournamentId ? <div className="text-sm text-slate-600">Turniej: {context.tournamentName || "-"}</div> : null}
              </>
            )}
          </div>
          <button onClick={handleClear} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
            Wyczyść listę
          </button>
        </div>
        {onBack ? (
          <button onClick={onBack} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            ← Powrót do meczów
          </button>
        ) : null}
      </div>
      <div className="text-sm text-gray-700 px-1">
        {roster.tournamentCount === 0 && roster.matchCount === 0 ? message : "Numer czepka wynika ze slotu. Puste sloty pozostają puste."}
      </div>
      {tournamentRosterMissing ? <div className="px-1 text-sm text-red-600">Najpierw wyślij listę turniejową.</div> : null}
      {rosterLoading ? <div className="px-1 text-sm text-slate-500">Ładowanie listy...</div> : null}
      {rosterError ? <div className="px-1 text-sm text-red-600">{rosterError}</div> : null}
      {roster.warning ? <div className="text-sm text-red-600">{roster.warning}</div> : null}
      {saveError ? <div className="text-sm text-red-600">{saveError}</div> : null}
      {saveMessage ? <div className="text-sm text-green-700">{saveMessage}</div> : null}
      {(roster.tournamentLimitReached || roster.matchLimitReached) ? <div className="text-sm text-red-600">Osiągnięto maksymalny limit zawodników.</div> : null}

      <RosterSearch query={roster.query} sortMode={roster.sortMode} onQueryChange={roster.setQuery} onSortModeChange={roster.setSortMode} />

      {isTournamentMode ? (
        <TournamentRosterPanel
          availablePlayers={roster.clubPlayersForTournament}
          slots={roster.tournamentSlots}
          count={roster.tournamentCount}
          limitReached={roster.tournamentLimitReached}
          targetDate={targetDate}
          onAddPlayers={roster.addPlayersToTournamentRoster}
          onAddPlayer={roster.addPlayerToTournamentRoster}
          onCopy={roster.copyPreviousTournamentRoster}
          onMoveTournamentPlayer={roster.moveTournamentPlayer}
          onRemoveFromTournament={roster.removeFromTournamentRoster}
        />
      ) : (
        <div className="grid items-stretch gap-3 lg:grid-cols-2">
          <RosterSourcePanel
            title={isTournamentMatch ? "Lista turniejowa" : "Zawodnicy klubu"}
            players={isTournamentMatch ? roster.tournamentPlayersForMatch : roster.clubPlayersForMatch}
            addDisabled={isTournamentMatch ? roster.matchLimitReached || tournamentRosterMissing : roster.matchLimitReached}
            targetDate={targetDate}
            onAdd={isTournamentMatch ? (tournamentRosterMissing ? () => undefined : roster.addTournamentPlayerToMatchRoster) : roster.addClubPlayerToMatchRoster}
          />

          <MatchRosterPanel
            slots={roster.matchSlots}
            count={roster.matchCount}
            limitReached={roster.matchLimitReached}
            targetDate={targetDate}
            onCopyPreviousMatch={tournamentRosterMissing ? () => undefined : roster.copyPreviousMatchRoster}
            onCopyPreviousTournament={tournamentRosterMissing ? () => undefined : roster.copyPreviousTournamentToMatchRoster}
            onCopyLastRoster={tournamentRosterMissing ? () => undefined : roster.copyLastRoster}
            onRemoveFromMatch={roster.removeFromMatchRoster}
            onMoveMatchPlayer={roster.moveMatchPlayer}
            onToggleGoalkeeper={roster.toggleMatchGoalkeeper}
            onToggleCaptain={roster.toggleMatchCaptain}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
        <button onClick={() => onBack?.()} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          Anuluj
        </button>
        <button onClick={handleSave} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300" disabled={!canSaveRoster}>
          {isTournamentMode ? "Zapisz listę turniejową" : "Zapisz listę meczową"}
        </button>
      </div>
    </div>
  );
};