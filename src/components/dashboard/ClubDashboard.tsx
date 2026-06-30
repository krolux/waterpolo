import React from "react";
import { CalendarClock, Users } from "lucide-react";
import { ClubOverview } from "../club/ClubOverview";
import { PlayerTable } from "../club/PlayerTable";
import { RosterPanel, type RosterContext } from "../club/RosterPanel";
import { Section } from "../shared/Section";
import {
  createPlayer,
  deactivatePlayer,
  getClubLogoSignedUrl,
  listClubsForLogoManagement,
  listPlayers,
  updateClubLogoUrl,
  updatePlayer,
  uploadClubLogo,
  type PlayerRow,
} from "../../lib/rosters";
import type { Match, Role } from "../../types/wpolo";
import type { Player } from "../../types/club";
import type { SaveRosterPayload } from "../../types/rosters";

type PlayerFormState = {
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  birthYear: string;
  defaultCapNumber: string;
  licenseNumber: string;
  loanClubName: string;
  notes: string;
  active: boolean;
};

type ClubDashboardProps = {
  effectiveUser: { name: string; role: Role; club?: string } | null;
  clubId?: string | null;
  matches: Match[];
  competitionNameById?: Record<string, string>;
  competitionSeasonNameById?: Record<string, string>;
  stageNameById?: Record<string, string>;
  tournamentNameById?: Record<string, string>;
  penaltiesByMatch: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
  onSaveRoster?: (payload: SaveRosterPayload) => void;
};

const emptyPlayerFormState = (): PlayerFormState => ({
  firstName: "",
  lastName: "",
  gender: "M",
  birthYear: "",
  defaultCapNumber: "",
  licenseNumber: "",
  loanClubName: "",
  notes: "",
  active: true,
});

const mapPlayerRowToPlayer = (player: PlayerRow): Player => ({
  id: player.id,
  firstName: player.first_name,
  lastName: player.last_name,
  gender: player.gender,
  birthYear: player.birth_year,
  capNumber: player.default_cap_number ?? 0,
  licenseNumber: player.license_number,
  loanFromClub: player.loan_club_name || undefined,
  loanClub: player.loan_club_name || undefined,
  licenseVerified: player.license_status === "valid",
  licenseStatus: player.license_status,
  licenseVerifiedAt: player.license_verified_at || undefined,
  licenseVerifiedBy: player.license_verified_by || undefined,
  licenseValidUntil: player.license_verified_until || undefined,
});

export const ClubDashboard: React.FC<ClubDashboardProps> = ({
  effectiveUser,
  clubId = null,
  matches,
  competitionNameById = {},
  competitionSeasonNameById = {},
  stageNameById = {},
  tournamentNameById = {},
  penaltiesByMatch: _penaltiesByMatch,
  onSaveRoster,
}) => {
  const myClub = effectiveUser?.club?.trim() || "";
  const [playerRows, setPlayerRows] = React.useState<PlayerRow[]>([]);
  const [loadingPlayers, setLoadingPlayers] = React.useState(false);
  const [playerError, setPlayerError] = React.useState<string | null>(null);
  const [savingPlayer, setSavingPlayer] = React.useState(false);
  const [editingPlayerId, setEditingPlayerId] = React.useState<string>("");
  const [playerForm, setPlayerForm] = React.useState<PlayerFormState>(emptyPlayerFormState);
  const [rosterContext, setRosterContext] = React.useState<RosterContext | null>(null);
  const [logoOptions, setLogoOptions] = React.useState<Array<{ id: string; name: string; logoUrl: string | null }>>([]);
  const [selectedLogoClubId, setSelectedLogoClubId] = React.useState<string>(clubId || "");
  const [logoPreviewUrl, setLogoPreviewUrl] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const maxBirthYearByTournamentId: Record<string, number> = {};
  const isAdmin = !!effectiveUser?.role && effectiveUser.role.toString().includes("Admin");

  const parseMatchDateTime = React.useCallback((match: Match) => new Date(`${match.date}T${match.time || "00:00"}`), []);

  const loadPlayers = React.useCallback(async () => {
    if (!clubId) {
      setPlayerRows([]);
      return;
    }

    setLoadingPlayers(true);
    setPlayerError(null);

    try {
      const rows = await listPlayers(clubId);
      setPlayerRows(rows);
    } catch {
      setPlayerRows([]);
      setPlayerError("Nie udało się pobrać zawodników.");
    } finally {
      setLoadingPlayers(false);
    }
  }, [clubId]);

  React.useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  React.useEffect(() => {
    let isActive = true;

    const loadLogoOptions = async () => {
      if (!clubId && !isAdmin) {
        setLogoOptions([]);
        setSelectedLogoClubId("");
        setLogoPreviewUrl(null);
        return;
      }

      try {
        const rows = await listClubsForLogoManagement();
        if (!isActive) return;

        const options = rows.map((row) => ({ id: row.id, name: row.name, logoUrl: row.logo_url || null }));
        setLogoOptions(options);

        const defaultClubId = isAdmin
          ? (selectedLogoClubId && options.some((option) => option.id === selectedLogoClubId) ? selectedLogoClubId : options[0]?.id || "")
          : (clubId || "");

        setSelectedLogoClubId(defaultClubId);
      } catch {
        if (!isActive) return;
        setLogoError("Nie udało się pobrać danych klubu.");
      }
    };

    void loadLogoOptions();

    return () => {
      isActive = false;
    };
  }, [clubId, isAdmin, selectedLogoClubId]);

  React.useEffect(() => {
    let isActive = true;

    const refreshLogoPreview = async () => {
      const currentOption = logoOptions.find((option) => option.id === selectedLogoClubId) || null;
      if (!currentOption?.logoUrl) {
        setLogoPreviewUrl(null);
        return;
      }

      try {
        const signedUrl = await getClubLogoSignedUrl(currentOption.logoUrl, 60 * 10);
        if (!isActive) return;
        setLogoPreviewUrl(signedUrl);
      } catch {
        if (!isActive) return;
        setLogoPreviewUrl(null);
      }
    };

    void refreshLogoPreview();

    return () => {
      isActive = false;
    };
  }, [logoOptions, selectedLogoClubId]);

  const handleLogoUpload = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const targetClubId = isAdmin ? selectedLogoClubId : clubId;
    if (!targetClubId) {
      setLogoError("Brak klubu do aktualizacji logo.");
      return;
    }

    setUploadingLogo(true);
    setLogoError(null);

    try {
      const storagePath = await uploadClubLogo(targetClubId, file);
      await updateClubLogoUrl(targetClubId, storagePath);

      const rows = await listClubsForLogoManagement();
      const options = rows.map((row) => ({ id: row.id, name: row.name, logoUrl: row.logo_url || null }));
      setLogoOptions(options);
    } catch {
      setLogoError("Nie udało się zapisać logo klubu.");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }, [clubId, isAdmin, selectedLogoClubId]);

  const clubPlayers = React.useMemo(() => playerRows.map(mapPlayerRowToPlayer), [playerRows]);

  const selectedPlayer = React.useMemo(
    () => playerRows.find((player) => player.id === editingPlayerId) || null,
    [editingPlayerId, playerRows]
  );

  const beginCreatePlayer = React.useCallback(() => {
    setEditingPlayerId("");
    setPlayerForm(emptyPlayerFormState());
  }, []);

  const beginEditPlayer = React.useCallback((player: PlayerRow) => {
    setEditingPlayerId(player.id);
    setPlayerForm({
      firstName: player.first_name,
      lastName: player.last_name,
      gender: player.gender,
      birthYear: String(player.birth_year),
      defaultCapNumber: player.default_cap_number === null ? "" : String(player.default_cap_number),
      licenseNumber: player.license_number,
      loanClubName: player.loan_club_name || "",
      notes: player.notes || "",
      active: player.active,
    });
  }, []);

  React.useEffect(() => {
    if (!selectedPlayer) {
      if (editingPlayerId) {
        beginCreatePlayer();
      }
      return;
    }

    setPlayerForm({
      firstName: selectedPlayer.first_name,
      lastName: selectedPlayer.last_name,
      gender: selectedPlayer.gender,
      birthYear: String(selectedPlayer.birth_year),
      defaultCapNumber: selectedPlayer.default_cap_number === null ? "" : String(selectedPlayer.default_cap_number),
      licenseNumber: selectedPlayer.license_number,
      loanClubName: selectedPlayer.loan_club_name || "",
      notes: selectedPlayer.notes || "",
      active: selectedPlayer.active,
    });
  }, [beginCreatePlayer, editingPlayerId, selectedPlayer]);

  const handlePlayerSubmit = React.useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clubId) {
      setPlayerError("Nie udało się zapisać zawodnika.");
      return;
    }

    const parsedBirthYear = Number(playerForm.birthYear);
    const parsedDefaultCapNumber = playerForm.defaultCapNumber.trim() === "" ? null : Number(playerForm.defaultCapNumber);

    setSavingPlayer(true);
    setPlayerError(null);

    try {
      const payload = {
        clubId,
        firstName: playerForm.firstName.trim(),
        lastName: playerForm.lastName.trim(),
        gender: playerForm.gender,
        birthYear: parsedBirthYear,
        defaultCapNumber: parsedDefaultCapNumber,
        licenseNumber: playerForm.licenseNumber.trim(),
        loanClubName: playerForm.loanClubName.trim() || null,
        notes: playerForm.notes.trim() || null,
        active: playerForm.active,
      };

      if (editingPlayerId) {
        await updatePlayer(editingPlayerId, payload);
      } else {
        await createPlayer(payload);
      }

      await loadPlayers();
      beginCreatePlayer();
    } catch {
      setPlayerError("Nie udało się zapisać zawodnika.");
    } finally {
      setSavingPlayer(false);
    }
  }, [beginCreatePlayer, clubId, editingPlayerId, loadPlayers, playerForm]);

  const handleDeactivatePlayer = React.useCallback(async () => {
    if (!editingPlayerId) {
      return;
    }

    setSavingPlayer(true);
    setPlayerError(null);

    try {
      await deactivatePlayer(editingPlayerId);
      await loadPlayers();
      beginCreatePlayer();
    } catch {
      setPlayerError("Nie udało się zapisać zawodnika.");
    } finally {
      setSavingPlayer(false);
    }
  }, [beginCreatePlayer, editingPlayerId, loadPlayers]);

  const upcomingClubMatches = React.useMemo(() => {
    if (!myClub) return [] as Match[];
    return matches
      .filter((match) => (match.home === myClub || match.away === myClub) && (!match.result || match.result.trim() === ""))
      .sort((a, b) => parseMatchDateTime(a).getTime() - parseMatchDateTime(b).getTime())
      .slice(0, 6);
  }, [matches, myClub, parseMatchDateTime]);

  const getCategoryLabel = React.useCallback((match: Match) => {
    if (match.competitionSeasonId && competitionSeasonNameById[match.competitionSeasonId]) {
      return competitionSeasonNameById[match.competitionSeasonId];
    }

    if (match.competitionSeasonId && competitionNameById[match.competitionSeasonId]) {
      return competitionNameById[match.competitionSeasonId];
    }

    return "Rozgrywki";
  }, [competitionNameById, competitionSeasonNameById]);

  const groupedUpcomingMatches = React.useMemo(() => {
    const groups = new Map<string, Match[]>();

    upcomingClubMatches.forEach((match) => {
      const categoryLabel = getCategoryLabel(match);
      const list = groups.get(categoryLabel) || [];
      list.push(match);
      groups.set(categoryLabel, list);
    });

    return Array.from(groups.entries()).map(([categoryLabel, groupedMatches]) => ({
      categoryLabel,
      matches: groupedMatches,
    }));
  }, [getCategoryLabel, upcomingClubMatches]);

  const getTournamentTargetDate = React.useCallback((match: Match) => match.date, []);

  const formatDate = React.useCallback((date: string) => new Date(date).toLocaleDateString("pl-PL"), []);

  return (
    <div className="space-y-4">
      <Section title="Logo klubu" icon={<Users className="w-5 h-5" />}>
        <div className="space-y-3 rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
          {isAdmin ? (
            <label className="text-xs text-slate-600">
              Wybierz klub
              <select
                value={selectedLogoClubId}
                onChange={(event) => setSelectedLogoClubId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
              >
                {logoOptions.map((clubOption) => (
                  <option key={clubOption.id} value={clubOption.id}>{clubOption.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="text-sm text-slate-700">Klub: <span className="font-semibold">{myClub || "-"}</span></div>
          )}

          {logoPreviewUrl ? (
            <div className="inline-flex items-center gap-3 rounded-xl border border-[#dbeafe] bg-white p-3">
              <img src={logoPreviewUrl} alt="Logo klubu" className="h-16 w-16 rounded object-contain bg-white" />
              <span className="text-xs text-slate-600">Aktualne logo klubu</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Brak wgranego logo.</div>
          )}

          <label className="inline-flex cursor-pointer items-center rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm text-[#08284a] hover:bg-sky-50">
            {uploadingLogo ? "Wgrywanie logo..." : "Wgraj logo"}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploadingLogo || (!isAdmin && !clubId)}
            />
          </label>

          {logoError ? <div className="text-xs text-red-600">{logoError}</div> : null}
        </div>
      </Section>

      <ClubOverview effectiveUser={effectiveUser} matches={matches} />

      <Section title="Lista startowa" icon={<Users className="w-5 h-5" />}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarClock className="h-4 w-4" />
            <span>Najbliższe mecze mojego klubu</span>
          </div>

          {upcomingClubMatches.length === 0 ? (
            <div className="rounded-xl border border-[#dbeafe] bg-white p-3 text-sm text-slate-500">
              Brak nadchodzących meczów dla Twojego klubu.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedUpcomingMatches.map((group) => (
                <div key={group.categoryLabel} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{group.categoryLabel}</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.matches.map((match) => {
                      const categoryLabel = getCategoryLabel(match);
                      const stageName = match.stageId ? stageNameById[match.stageId] : undefined;
                      const tournamentName = match.tournamentId ? tournamentNameById[match.tournamentId] : undefined;

                      return (
                        <div key={match.id} className="rounded-xl border border-[#dbeafe] bg-white p-3 text-sm shadow-sm">
                          <div className="mb-2 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#08284a]">
                            {categoryLabel}
                          </div>
                          <div className="space-y-0.5 text-xs text-slate-600">
                            {stageName ? <div>Etap: {stageName}</div> : null}
                            {tournamentName ? <div>Turniej: {tournamentName}</div> : null}
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
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
                                targetDate: match.date,
                                tournamentId: match.tournamentId || undefined,
                                tournamentName: tournamentName || undefined,
                                maxBirthYear: match.tournamentId ? maxBirthYearByTournamentId[match.tournamentId] : undefined,
                              })}
                              className="rounded-lg border border-[#dbeafe] bg-white px-2 py-1 text-xs text-[#08284a] hover:bg-sky-50"
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
                                  targetDate: getTournamentTargetDate(match),
                                  tournamentId: match.tournamentId || undefined,
                                  tournamentName: tournamentName || undefined,
                                  maxBirthYear: maxBirthYearByTournamentId[match.tournamentId],
                                })}
                                className="rounded-lg border border-[#dbeafe] bg-white px-2 py-1 text-xs text-[#08284a] hover:bg-sky-50"
                              >
                                Lista turniejowa
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <RosterPanel
            players={clubPlayers}
            context={rosterContext}
            onBack={() => setRosterContext(null)}
            clubName={myClub}
            clubId={clubId}
            canSaveRoster={effectiveUser?.role === "Club"}
            onSaveRoster={onSaveRoster}
          />
        </div>
      </Section>

      <Section title="Zawodnicy" icon={<Users className="w-5 h-5" />}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-800">Dodaj zawodnika</div>
                <div className="text-xs text-slate-500">Zapis trafia bezpośrednio do tabeli players.</div>
              </div>
              <button
                type="button"
                onClick={beginCreatePlayer}
                className="rounded-xl border border-[#dbeafe] bg-white px-3 py-1.5 text-xs text-[#08284a] hover:bg-sky-50"
              >
                Nowy zawodnik
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-600">
                Edytuj istniejącego zawodnika
                <select
                  value={editingPlayerId}
                  onChange={(event) => {
                    const nextPlayer = playerRows.find((player) => player.id === event.target.value);
                    if (!nextPlayer) {
                      beginCreatePlayer();
                      return;
                    }
                    beginEditPlayer(nextPlayer);
                  }}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Nowy zawodnik</option>
                  {playerRows.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.last_name} {player.first_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadingPlayers ? <div className="mb-3 text-sm text-slate-500">Ładowanie zawodników...</div> : null}
            {playerError ? <div className="mb-3 text-sm text-red-600">{playerError}</div> : null}

            <form onSubmit={handlePlayerSubmit} className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-600">
                Imię
                <input
                  value={playerForm.firstName}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, firstName: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-xs text-slate-600">
                Nazwisko
                <input
                  value={playerForm.lastName}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, lastName: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-xs text-slate-600">
                Płeć
                <select
                  value={playerForm.gender}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, gender: event.target.value as "M" | "F" }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Rocznik
                <input
                  type="number"
                  value={playerForm.birthYear}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, birthYear: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-xs text-slate-600">
                Domyślny numer czepka
                <input
                  type="number"
                  value={playerForm.defaultCapNumber}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, defaultCapNumber: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-600">
                Numer licencji
                <input
                  value={playerForm.licenseNumber}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, licenseNumber: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="text-xs text-slate-600">
                Klub wypożyczający (opcjonalnie)
                <input
                  value={playerForm.loanClubName}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, loanClubName: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-600 md:col-span-2">
                Uwagi
                <textarea
                  value={playerForm.notes}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-1 min-h-24 w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={playerForm.active}
                  onChange={(event) => setPlayerForm((current) => ({ ...current, active: event.target.checked }))}
                  className="h-4 w-4"
                />
                Aktywny
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={savingPlayer}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-60"
                >
                  {editingPlayerId ? "Zapisz zmiany" : "Dodaj zawodnika"}
                </button>
                <button
                  type="button"
                  onClick={handleDeactivatePlayer}
                  disabled={!editingPlayerId || savingPlayer}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                >
                  Dezaktywuj
                </button>
              </div>
            </form>
          </div>

          {loadingPlayers ? <div className="text-sm text-slate-500">Ładowanie zawodników...</div> : null}
          {!loadingPlayers ? <PlayerTable players={clubPlayers} /> : null}
        </div>
      </Section>
    </div>
  );
};
