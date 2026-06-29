import React from "react";
import { MatchRosterPanel } from "./MatchRosterPanel";
import { RosterSearch } from "./RosterSearch";
import { RosterSourcePanel } from "./RosterSourcePanel";
import { TournamentRosterPanel } from "./TournamentRosterPanel";
import { useRosterPanel } from "../../hooks/useRosterPanel";
import { getTournamentRoster, saveTournamentRoster, type TournamentRosterWithPlayers } from "../../lib/rosters";
import { supabase } from "../../lib/supabase";
import type { Player } from "../../types/club";
import { resolveRosterLicenseStatus, type SaveRosterPayload } from "../../types/rosters";

export type RosterContext =
  | {
      mode: "tournament";
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
  const [initialTournamentRosterPlayers, setInitialTournamentRosterPlayers] = React.useState<ReturnType<typeof mapTournamentRosterPlayers> | null>(null);
  const roster = useRosterPanel(players, { maxBirthYear: context?.maxBirthYear, initialTournamentRosterPlayers });
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const isTournamentMode = context?.mode === "tournament";
  const isTournamentMatch = context?.mode === "match" && !!context?.tournamentId;
  const targetDate = context?.targetDate || context?.date;
  const headerTitle = !context
    ? ""
    : isTournamentMode
      ? `Zgłoszenie do turnieju: ${context.tournamentName || "Turniej"}`
      : `Lista startowa meczu: ${context.home} vs ${context.away}`;
  const matchSubtitle = context ? `${new Date(context.date).toLocaleDateString("pl-PL")} • ${context.location}` : "";

  const handleClear = () => {
    if (isTournamentMode) {
      roster.clearTournamentRoster();
      return;
    }
    roster.clearMatchRoster();
  };

  React.useEffect(() => {
    let isActive = true;

    if (!isTournamentMode || !context?.tournamentId || !clubId) {
      setInitialTournamentRosterPlayers(null);
      return;
    }

    (async () => {
      try {
        const savedRoster = await getTournamentRoster(context.tournamentId, clubId);
        if (!isActive) return;
        setInitialTournamentRosterPlayers(savedRoster ? mapTournamentRosterPlayers(savedRoster) : []);
      } catch {
        if (!isActive) return;
        setInitialTournamentRosterPlayers([]);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [clubId, context?.tournamentId, isTournamentMode]);

  const handleSave = async () => {
    if (!canSaveRoster) {
      setSaveMessage("Brak uprawnień do zapisu składu.");
      return;
    }

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
        mode: context.mode,
        clubName: clubName || "Nieznany klub",
        tournamentId: context.tournamentId,
        submittedByProfileId: authData.user?.id || null,
        submittedByName,
        players: payloadPlayers,
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!context.tournamentId || !clubId) {
        setSaveMessage("Brak danych do zapisu listy turniejowej.");
        return;
      }

      const savedRoster = await saveTournamentRoster({
        tournamentId: context.tournamentId,
        clubId,
        submittedByProfileId: payload.submittedByProfileId,
        submittedByName: payload.submittedByName,
        players: payloadPlayers.map((player) => ({
          playerId: player.playerId,
          slot: player.slot,
          displayOrder: player.displayOrder,
        })),
      });

      setInitialTournamentRosterPlayers(mapTournamentRosterPlayers(savedRoster));
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

    const payload: SaveRosterPayload = {
      mode: context.mode,
      clubName: clubName || "Nieznany klub",
      matchId: context.mode === "match" ? context.matchId : undefined,
      tournamentId: context.tournamentId,
      players: payloadPlayers,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRoster?.(payload);
    setSaveMessage("Skład zapisany.");
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
      {roster.warning ? <div className="text-sm text-red-600">{roster.warning}</div> : null}
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
            addDisabled={roster.matchLimitReached}
            targetDate={targetDate}
            onAdd={isTournamentMatch ? roster.addTournamentPlayerToMatchRoster : roster.addClubPlayerToMatchRoster}
          />

          <MatchRosterPanel
            slots={roster.matchSlots}
            count={roster.matchCount}
            limitReached={roster.matchLimitReached}
            targetDate={targetDate}
            onCopyPreviousMatch={roster.copyPreviousMatchRoster}
            onCopyPreviousTournament={roster.copyPreviousTournamentToMatchRoster}
            onCopyLastRoster={roster.copyLastRoster}
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