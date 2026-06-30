import React from "react";
import { Shield, Trash2 } from "lucide-react";
import { CompetitionMatchesView } from "../matches/CompetitionMatchesView";
import { MatchesTable } from "../matches/MatchesTable";
import { AdminPanel } from "../matches/AdminPanel";
import { RankingTable } from "../matches/RankingTable";
import { Section } from "../shared/Section";
import { StageForm } from "../tournaments/StageForm";
import { TournamentForm } from "../tournaments/TournamentForm";
import { MatchForm } from "../matches/MatchForm";
import { LicenseStatus } from "../club/LicenseStatus";
import {
  getClubIdsByNames,
  getLatestMatchRosterSubmission,
  getLatestTournamentRosterSubmission,
  getMatchRoster,
  getTournamentRoster,
  verifyPlayerLicense,
  type MatchRosterSubmissionRow,
  type MatchRosterWithPlayers,
  type TournamentRosterWithPlayers,
} from "../../lib/rosters";
import type { Competition, CompetitionSeason, Stage, Tournament, TournamentClub } from "../../lib/competitions";
import type { AppState, Match, Role } from "../../types/wpolo";

type MatchesPageProps = {
  competitions: Competition[];
  fallbackCompetitions: Competition[];
  handleCompetitionChange: (competitionId: string) => void;
  selectedCompetitionId: string | null;
  selectedCompetitionSeason: CompetitionSeason | null;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  penaltiesByMatch: any;
  effectiveUser: { name: string; role: Role; club?: string } | null;
  clubs: string[];
  refereeNames: string[];
  delegateNames: string[];
  delegateCandidateNames: string[];
  refreshMatches: () => Promise<void>;
  refreshPenalties: () => Promise<void>;
  loadingMatches: boolean;
  handleRemovePenalty: (id: string) => Promise<void>;
  handleQuickEdit: (matchId: string) => void;
  handleCancelInlineEdit: () => void;
  editingMatchId: string | null;
  isAdmin: (user: { role: Role }) => boolean;
  removeWholeSlot: (
    kind: "comms" | "roster" | "report" | "photos",
    matchId: string,
    clubOrNeutral: string,
    path?: string
  ) => Promise<void>;
  ExportImport: React.FC<{ state: AppState; setState: (s: AppState) => void }>;
  loadingStages: boolean;
  stages: Stage[];
  tournaments: Map<string, Tournament[]>;
  handleDeleteStage: (stageId: string) => Promise<void>;
  handleDeleteTournament: (tournamentId: string) => Promise<void>;
  tournamentClubs: Map<string, TournamentClub[]>;
  showAddTournamentClubForm: boolean;
  setShowAddTournamentClubForm: React.Dispatch<React.SetStateAction<boolean>>;
  tournamentClubFormData: { clubName: string };
  setTournamentClubFormData: React.Dispatch<React.SetStateAction<{ clubName: string }>>;
  handleAddTournamentClub: (tournamentId: string) => Promise<void>;
  handleDeleteTournamentClub: (clubId: string, tournamentId: string) => Promise<void>;
  setSelectedTournamentForMatch: React.Dispatch<React.SetStateAction<string | null>>;
  setShowAddMatchForm: React.Dispatch<React.SetStateAction<boolean>>;
  showAddStageForm: boolean;
  setShowAddStageForm: React.Dispatch<React.SetStateAction<boolean>>;
  stageFormData: { name: string; type: string; startDate: string; endDate: string };
  setStageFormData: React.Dispatch<React.SetStateAction<{ name: string; type: string; startDate: string; endDate: string }>>;
  handleAddStage: () => Promise<void>;
  showAddTournamentForm: boolean;
  setShowAddTournamentForm: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStageForTournament: string | null;
  setSelectedStageForTournament: React.Dispatch<React.SetStateAction<string | null>>;
  tournamentFormData: { name: string; type: string; startDate: string; endDate: string };
  setTournamentFormData: React.Dispatch<React.SetStateAction<{ name: string; type: string; startDate: string; endDate: string }>>;
  handleAddTournament: () => Promise<void>;
  showAddMatchForm: boolean;
  selectedTournamentForMatch: string | null;
  matchFormData: {
    date: string;
    time: string;
    location: string;
    round: string;
    series_round: string;
    home: string;
    away: string;
    referee1: string;
    referee2: string;
    delegate: string;
  };
  setMatchFormData: React.Dispatch<
    React.SetStateAction<{
      date: string;
      time: string;
      location: string;
      round: string;
      series_round: string;
      home: string;
      away: string;
      referee1: string;
      referee2: string;
      delegate: string;
    }>
  >;
  handleAddMatch: () => Promise<void>;
};

type MatchRosterPreviewState = {
  match: Match;
  clubName: string;
  clubId: string;
  clubSide: "home" | "away";
  roster: MatchRosterWithPlayers | null;
  submission: MatchRosterSubmissionRow | null;
};

type TournamentRosterPreviewState = {
  tournamentId: string;
  clubName: string;
  clubId: string;
  roster: TournamentRosterWithPlayers | null;
  submission: MatchRosterSubmissionRow | null;
};

export const MatchesPage: React.FC<MatchesPageProps> = ({
  competitions,
  fallbackCompetitions,
  handleCompetitionChange,
  selectedCompetitionId,
  selectedCompetitionSeason,
  state,
  setState,
  penaltiesByMatch,
  effectiveUser,
  clubs,
  refereeNames,
  delegateNames,
  delegateCandidateNames,
  refreshMatches,
  refreshPenalties,
  loadingMatches,
  handleRemovePenalty,
  handleQuickEdit,
  handleCancelInlineEdit,
  editingMatchId,
  isAdmin,
  removeWholeSlot,
  ExportImport,
  loadingStages,
  stages,
  tournaments,
  handleDeleteStage,
  handleDeleteTournament,
  tournamentClubs,
  showAddTournamentClubForm,
  setShowAddTournamentClubForm,
  tournamentClubFormData,
  setTournamentClubFormData,
  handleAddTournamentClub,
  handleDeleteTournamentClub,
  setSelectedTournamentForMatch,
  setShowAddMatchForm,
  showAddStageForm,
  setShowAddStageForm,
  stageFormData,
  setStageFormData,
  handleAddStage,
  showAddTournamentForm,
  setShowAddTournamentForm,
  selectedStageForTournament,
  setSelectedStageForTournament,
  tournamentFormData,
  setTournamentFormData,
  handleAddTournament,
  showAddMatchForm,
  selectedTournamentForMatch,
  matchFormData,
  setMatchFormData,
  handleAddMatch,
}) => {
  const [openRosterPreview, setOpenRosterPreview] = React.useState<{ tournamentId: string; clubName: string } | null>(null);
  const [tournamentRosterPreview, setTournamentRosterPreview] = React.useState<TournamentRosterPreviewState | null>(null);
  const [loadingTournamentRosterPreview, setLoadingTournamentRosterPreview] = React.useState(false);
  const [tournamentRosterPreviewError, setTournamentRosterPreviewError] = React.useState<string | null>(null);
  const [verifyingTournamentLicenseIds, setVerifyingTournamentLicenseIds] = React.useState<Set<string>>(new Set());
  const [openMatchRosterPreview, setOpenMatchRosterPreview] = React.useState<{ matchId: string; clubSide: "home" | "away" } | null>(null);
  const [loadingMatchRosterPreview, setLoadingMatchRosterPreview] = React.useState(false);
  const [matchRosterPreviewError, setMatchRosterPreviewError] = React.useState<string | null>(null);
  const [matchRosterPreview, setMatchRosterPreview] = React.useState<MatchRosterPreviewState | null>(null);
  const [verifyingMatchLicenseIds, setVerifyingMatchLicenseIds] = React.useState<Set<string>>(new Set());
  const canApprove = !!effectiveUser && ["Referee", "Delegate", "Admin"].includes(effectiveUser.role);
  const canVerifyMatchLicenses = !!effectiveUser && ["Referee", "Delegate", "Admin"].includes(effectiveUser.role);
  const tournamentTargetDateById = React.useMemo(() => {
    const map = new Map<string, string>();
    state.matches.forEach((match) => {
      if (!match.tournamentId) return;
      const current = map.get(match.tournamentId);
      if (!current || match.date > current) {
        map.set(match.tournamentId, match.date);
      }
    });
    return map;
  }, [state.matches]);

  const computeValidUntilByMonths = React.useCallback((fromDate: string | null | undefined, months: number) => {
    const base = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date();
    if (Number.isNaN(base.getTime())) {
      const fallback = new Date();
      fallback.setMonth(fallback.getMonth() + months);
      return fallback.toISOString().slice(0, 10);
    }

    base.setMonth(base.getMonth() + months);
    return base.toISOString().slice(0, 10);
  }, []);

  const getLastTournamentMatchDate = React.useCallback((tournamentId: string) => {
    const dates = state.matches
      .filter((match) => match.tournamentId === tournamentId)
      .map((match) => match.date)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return dates[0] || null;
  }, [state.matches]);

  const loadTournamentRosterPreview = React.useCallback(async (tournamentId: string, clubName: string) => {
    setLoadingTournamentRosterPreview(true);
    setTournamentRosterPreviewError(null);

    try {
      const clubIds = await getClubIdsByNames([clubName]);
      const clubId = clubIds.get(clubName);

      if (!clubId) {
        setTournamentRosterPreview({
          tournamentId,
          clubName,
          clubId: "",
          roster: null,
          submission: null,
        });
        return;
      }

      const roster = await getTournamentRoster(tournamentId, clubId);
      const submission = roster ? await getLatestTournamentRosterSubmission(roster.id) : null;

      setTournamentRosterPreview({
        tournamentId,
        clubName,
        clubId,
        roster,
        submission,
      });
    } catch {
      setTournamentRosterPreview(null);
      setTournamentRosterPreviewError("Nie udało się pobrać składu turniejowego.");
    } finally {
      setLoadingTournamentRosterPreview(false);
    }
  }, []);

  React.useEffect(() => {
    if (!openRosterPreview) {
      setTournamentRosterPreview(null);
      setTournamentRosterPreviewError(null);
      setLoadingTournamentRosterPreview(false);
      return;
    }

    void loadTournamentRosterPreview(openRosterPreview.tournamentId, openRosterPreview.clubName);
  }, [loadTournamentRosterPreview, openRosterPreview]);

  const handleApproveTournamentPlayer = React.useCallback(async (playerId: string, tournamentId: string, clubName: string) => {
    if (!effectiveUser) return;

    setVerifyingTournamentLicenseIds((current) => new Set(current).add(playerId));

    try {
      const lastMatchDate = getLastTournamentMatchDate(tournamentId);
      await verifyPlayerLicense({
        playerId,
        checkedByName: effectiveUser.name,
        checkedByRole: effectiveUser.role,
        validUntil: computeValidUntilByMonths(lastMatchDate, 3),
        verificationType: "tournament",
        tournamentId,
      });

      await loadTournamentRosterPreview(tournamentId, clubName);
    } finally {
      setVerifyingTournamentLicenseIds((current) => {
        const next = new Set(current);
        next.delete(playerId);
        return next;
      });
    }
  }, [computeValidUntilByMonths, effectiveUser, getLastTournamentMatchDate, loadTournamentRosterPreview]);

  const computeValidUntilFromMatchDate = React.useCallback((matchDate: string) => computeValidUntilByMonths(matchDate, 3), [computeValidUntilByMonths]);

  const loadMatchRosterPreview = React.useCallback(async (match: Match, clubSide: "home" | "away") => {
    const clubName = clubSide === "home" ? match.home : match.away;

    setOpenMatchRosterPreview({ matchId: match.id, clubSide });
    setLoadingMatchRosterPreview(true);
    setMatchRosterPreviewError(null);

    try {
      const clubIds = await getClubIdsByNames([clubName]);
      const clubId = clubIds.get(clubName);

      if (!clubId) {
        setMatchRosterPreview({
          match,
          clubName,
          clubId: "",
          clubSide,
          roster: null,
          submission: null,
        });
        return;
      }

      const roster = await getMatchRoster(match.id, clubId);
      const submission = roster ? await getLatestMatchRosterSubmission(roster.id) : null;

      setMatchRosterPreview({
        match,
        clubName,
        clubId,
        clubSide,
        roster,
        submission,
      });
    } catch {
      setMatchRosterPreview(null);
      setMatchRosterPreviewError("Nie udało się pobrać listy meczowej.");
    } finally {
      setLoadingMatchRosterPreview(false);
    }
  }, []);

  const handleVerifyMatchLicense = React.useCallback(async (playerId: string) => {
    if (!effectiveUser || !matchRosterPreview) return;

    setVerifyingMatchLicenseIds((current) => new Set(current).add(playerId));

    try {
      await verifyPlayerLicense({
        playerId,
        checkedByName: effectiveUser.name,
        checkedByRole: effectiveUser.role,
        verificationType: "match",
        matchId: matchRosterPreview.match.id,
        validUntil: computeValidUntilFromMatchDate(matchRosterPreview.match.date),
      });

      await loadMatchRosterPreview(matchRosterPreview.match, matchRosterPreview.clubSide);
    } finally {
      setVerifyingMatchLicenseIds((current) => {
        const next = new Set(current);
        next.delete(playerId);
        return next;
      });
    }
  }, [computeValidUntilFromMatchDate, effectiveUser, loadMatchRosterPreview, matchRosterPreview]);

  const formatDateTime = React.useCallback((value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("pl-PL");
  }, []);

  const renderMatchRosterActionExtras = React.useCallback((match: Match) => {
    const activeHome = openMatchRosterPreview?.matchId === match.id && openMatchRosterPreview?.clubSide === "home";
    const activeAway = openMatchRosterPreview?.matchId === match.id && openMatchRosterPreview?.clubSide === "away";

    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (activeHome) {
              setOpenMatchRosterPreview(null);
              setMatchRosterPreview(null);
              setMatchRosterPreviewError(null);
              return;
            }
            void loadMatchRosterPreview(match, "home");
          }}
          className={activeHome ? "rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700" : "rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"}
        >
          Skład gospodarzy
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeAway) {
              setOpenMatchRosterPreview(null);
              setMatchRosterPreview(null);
              setMatchRosterPreviewError(null);
              return;
            }
            void loadMatchRosterPreview(match, "away");
          }}
          className={activeAway ? "rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700" : "rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"}
        >
          Skład gości
        </button>
      </>
    );
  }, [loadMatchRosterPreview, openMatchRosterPreview]);

  const renderMatchRosterExpandedExtras = React.useCallback((match: Match) => {
    if (!openMatchRosterPreview || openMatchRosterPreview.matchId !== match.id) {
      return null;
    }

    const isActivePreviewMatch = matchRosterPreview?.match.id === match.id && matchRosterPreview.clubSide === openMatchRosterPreview.clubSide;
    const previewClubName = openMatchRosterPreview.clubSide === "home" ? match.home : match.away;

    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
          <div className="text-sm font-semibold text-slate-800">Lista meczowa: {previewClubName}</div>
          <div>Mecz: {match.home} vs {match.away}</div>
          <div>Data: {new Date(match.date).toLocaleDateString("pl-PL")}</div>
        </div>

        {loadingMatchRosterPreview ? <div className="px-3 py-2 text-xs text-slate-500">Ładowanie listy meczowej...</div> : null}
        {matchRosterPreviewError ? <div className="px-3 py-2 text-xs text-red-600">{matchRosterPreviewError}</div> : null}

        {!loadingMatchRosterPreview && !matchRosterPreviewError && isActivePreviewMatch ? (
          matchRosterPreview.roster ? (
            <div>
              {(matchRosterPreview.submission?.submitted_at || matchRosterPreview.roster.updated_at || typeof matchRosterPreview.submission?.version === "number" || matchRosterPreview.submission?.submitted_by_name) ? (
                <div className="flex flex-wrap gap-3 border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
                  {matchRosterPreview.submission?.submitted_at ? <span>Skład wysłano: {new Date(matchRosterPreview.submission.submitted_at).toLocaleString("pl-PL")}</span> : null}
                  {formatDateTime(matchRosterPreview.roster.updated_at) ? <span>Ostatnia zmiana: {formatDateTime(matchRosterPreview.roster.updated_at)}</span> : null}
                  {typeof matchRosterPreview.submission?.version === "number" ? <span>Wersja: {matchRosterPreview.submission.version}</span> : null}
                  {matchRosterPreview.submission?.submitted_by_name ? <span>Autor zgłoszenia: {matchRosterPreview.submission.submitted_by_name}</span> : null}
                  {matchRosterPreview.submission ? <span>Kod wydruku: {matchRosterPreview.submission.verification_code || "-"}</span> : null}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left text-gray-700">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-2 py-1.5">Slot</th>
                      <th className="px-2 py-1.5">Zawodnik</th>
                      <th className="px-2 py-1.5">Rocznik</th>
                      <th className="px-2 py-1.5">Nr licencji</th>
                      <th className="px-2 py-1.5">Wypożyczony z</th>
                      <th className="px-2 py-1.5">GK</th>
                      <th className="px-2 py-1.5">C</th>
                      <th className="px-2 py-1.5">Status licencji</th>
                      <th className="px-2 py-1.5 text-right">Akcja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchRosterPreview.roster.players.map((entry) => {
                      const isVerifying = verifyingMatchLicenseIds.has(entry.player.id);
                      return (
                        <tr key={entry.id} className="border-t border-slate-200 align-top">
                          <td className="px-2 py-1.5">{entry.slot}</td>
                          <td className="px-2 py-1.5">{entry.player.first_name} {entry.player.last_name}</td>
                          <td className="px-2 py-1.5">{entry.player.birth_year}</td>
                          <td className="px-2 py-1.5">{entry.player.license_number}</td>
                          <td className="px-2 py-1.5">{entry.player.loan_club_name || "-"}</td>
                          <td className="px-2 py-1.5">{entry.is_goalkeeper ? "Tak" : "-"}</td>
                          <td className="px-2 py-1.5">{entry.is_captain ? "Tak" : "-"}</td>
                          <td className="px-2 py-1.5">
                            <LicenseStatus
                              licenseStatus={entry.player.license_status}
                              licenseValidUntil={entry.player.license_verified_until || undefined}
                              targetDate={match.date}
                              verifiedAt={entry.player.license_verified_at || undefined}
                              verifiedBy={entry.player.license_verified_by || undefined}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {canVerifyMatchLicenses ? (
                              <button
                                onClick={() => void handleVerifyMatchLicense(entry.player.id)}
                                disabled={isVerifying}
                                className={isVerifying ? "rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 text-xs text-gray-400 cursor-not-allowed" : "rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"}
                              >
                                Zweryfikuj licencję
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500">Brak zapisanej listy meczowej dla tej drużyny.</div>
          )
        ) : null}
      </div>
    );
  }, [canVerifyMatchLicenses, formatDateTime, handleVerifyMatchLicense, loadingMatchRosterPreview, matchRosterPreview, matchRosterPreviewError, openMatchRosterPreview, verifyingMatchLicenseIds]);

  return (
    <>
      <div className="mb-4 rounded-3xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Filtr rozgrywek</div>
        <div className="mb-2 text-base font-semibold text-[#061a33]">Kategoria rozgrywek</div>
        <div className="flex flex-wrap gap-2">
          {(competitions.length ? competitions : fallbackCompetitions).map(comp => (
            <button
              key={comp.id}
              onClick={() => handleCompetitionChange(comp.id)}
              className={
                "rounded-2xl border px-3 py-2 text-sm font-medium transition " +
                (selectedCompetitionId === comp.id
                  ? "border-[#058CFF] bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white shadow-[0_8px_16px_rgba(5,140,255,0.24)] hover:from-[#0f99ff] hover:to-[#4acbff]"
                  : "border-[#dbeafe] bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50")
              }
            >
              {comp.short_name || comp.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCompetitionSeason?.competition_id === competitions.find(c => c.name === "Ekstraklasa")?.id ? (
        <CompetitionMatchesView
          mode="competition"
          competitionSeasonId={selectedCompetitionSeason?.id ?? null}
          matches={state.matches}
          penalties={penaltiesByMatch}
          documents={state.matches}
          currentUser={effectiveUser}
          state={state}
          setState={setState}
          clubs={clubs}
          refereeNames={refereeNames}
          delegateNames={delegateNames}
          delegateCandidateNames={delegateCandidateNames}
          onRefreshMatches={() => {
            refreshMatches();
            refreshPenalties();
          }}
          loadingMatches={loadingMatches}
          onRemovePenalty={handleRemovePenalty}
          onQuickEdit={handleQuickEdit}
          onCancelEdit={handleCancelInlineEdit}
          editingMatchId={editingMatchId}
          isAdmin={isAdmin}
          renderMatchesTable={({ title, variant, sectionClassName, showExport, tableState, currentUser }) => (
            <MatchesTable
              title={title}
              variant={variant}
              sectionClassName={sectionClassName}
              showExport={showExport}
              state={tableState}
              setState={setState}
              user={currentUser ?? null}
              onRefresh={refreshMatches}
              loading={loadingMatches}
              penaltyMap={penaltiesByMatch}
              onRemovePenalty={handleRemovePenalty}
              onQuickEdit={handleQuickEdit}
              clubs={clubs}
              refereeNames={refereeNames}
              delegateNames={delegateCandidateNames}
              editingMatchId={editingMatchId}
              onCancelEdit={handleCancelInlineEdit}
              removeWholeSlot={removeWholeSlot}
              renderExportImport={({ state, setState }) => <ExportImport state={state} setState={setState} />}
              renderMatchActionExtras={variant === "upcoming" ? renderMatchRosterActionExtras : undefined}
              renderMatchExpandedExtras={variant === "upcoming" ? renderMatchRosterExpandedExtras : undefined}
              renderAdminPanel={m => (
                <AdminPanel
                  state={state}
                  setState={setState}
                  clubs={clubs}
                  refereeNames={refereeNames}
                  delegateNames={delegateCandidateNames}
                  onAfterChange={() => {
                    refreshMatches();
                    handleCancelInlineEdit();
                  }}
                  canWrite={true}
                  editingMatchId={m.id}
                  clearEditing={handleCancelInlineEdit}
                  compact
                />
              )}
            />
          )}
          renderRankingTable={({ matches, clubs }) => <RankingTable matches={matches} clubs={clubs as string[]} />}
          renderCompetitionAdminPanel={() => (
            <AdminPanel
              state={state}
              setState={setState}
              clubs={clubs}
              refereeNames={refereeNames}
              delegateNames={delegateCandidateNames}
              onAfterChange={() => {
                refreshMatches();
              }}
              canWrite={true}
              editingMatchId={editingMatchId}
              clearEditing={handleCancelInlineEdit}
            />
          )}
        />
      ) : (
        <div className="space-y-4">
          <Section title={selectedCompetitionSeason?.name || "Kategoria"} icon={<Shield className="w-5 h-5" />}>
            {loadingStages ? (
              <div className="text-gray-500">Ładowanie etapów...</div>
            ) : stages.length === 0 ? (
              <div className="text-gray-500">Brak etapów. {effectiveUser && isAdmin(effectiveUser) && "Dodaj pierwszy etap."}</div>
            ) : (
              <div className="space-y-4">
                {stages.map(stage => (
                  <div key={stage.id} className="rounded-2xl border border-[#dbeafe] bg-white pl-4 py-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{stage.name}</h3>
                        <p className="text-sm text-gray-600">
                          Typ: {stage.stage_type}
                          {stage.start_date && ` • ${new Date(stage.start_date).toLocaleDateString("pl-PL")}`}
                        </p>
                      </div>
                      {effectiveUser && isAdmin(effectiveUser) && (
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="p-2 hover:bg-red-100 rounded transition"
                          title="Usuń etap"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>

                    {tournaments.get(stage.id) && tournaments.get(stage.id)!.length > 0 ? (
                      <div className="mt-3 space-y-3 ml-2 border-t pt-2">
                        {tournaments.get(stage.id)!.map(tournament => (
                          <div key={tournament.id} className="rounded-xl border border-[#dbeafe] bg-white">
                            <div className="flex items-center justify-between border-b border-[#dbeafe] bg-[#f8fbff] p-2">
                              <div>
                                <p className="font-medium text-gray-800">{tournament.name}</p>
                                <p className="text-xs text-gray-500">
                                  Typ: {tournament.tournament_type}
                                  {tournament.start_date && ` • ${new Date(tournament.start_date).toLocaleDateString("pl-PL")}`}
                                </p>
                              </div>
                              {effectiveUser && isAdmin(effectiveUser) && (
                                <button
                                  onClick={() => handleDeleteTournament(tournament.id)}
                                  className="p-1 hover:bg-red-100 rounded transition"
                                  title="Usuń turniej"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              )}
                            </div>

                            <div className="border-b border-[#dbeafe] bg-white p-3">
                              <div className="mb-2 text-sm font-semibold text-slate-700">Drużyny zgłoszone do turnieju</div>
                              <div className="space-y-2">
                                {(tournamentClubs.get(tournament.id) ?? []).map((club) => {
                                  const previewOpen = openRosterPreview?.tournamentId === tournament.id && openRosterPreview?.clubName === club.club_name;
                                  const isActivePreview = previewOpen && tournamentRosterPreview?.tournamentId === tournament.id && tournamentRosterPreview?.clubName === club.club_name;
                                  const targetDate = tournamentTargetDateById.get(tournament.id) || undefined;

                                  return (
                                    <div key={club.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-slate-700">{club.club_name}</span>
                                        <button
                                          className="rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                                          onClick={() => setOpenRosterPreview(previewOpen ? null : { tournamentId: tournament.id, clubName: club.club_name })}
                                        >
                                          Sprawdź skład
                                        </button>
                                      </div>

                                      {previewOpen ? (
                                        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                          {loadingTournamentRosterPreview ? <div className="p-2 text-xs text-slate-500">Ładowanie składu...</div> : null}
                                          {tournamentRosterPreviewError && isActivePreview ? <div className="p-2 text-xs text-red-600">{tournamentRosterPreviewError}</div> : null}

                                          {!loadingTournamentRosterPreview && isActivePreview && tournamentRosterPreview?.roster ? (
                                            <>
                                              {(tournamentRosterPreview.submission?.submitted_at || tournamentRosterPreview.roster.updated_at || typeof tournamentRosterPreview.submission?.version === "number" || tournamentRosterPreview.submission?.submitted_by_name) ? (
                                                <div className="flex flex-wrap gap-3 border-b border-slate-200 px-2 py-1.5 text-xs text-slate-600">
                                                  {tournamentRosterPreview.submission?.submitted_at ? <span>Skład wysłano: {new Date(tournamentRosterPreview.submission.submitted_at).toLocaleString("pl-PL")}</span> : null}
                                                  {formatDateTime(tournamentRosterPreview.roster.updated_at) ? <span>Ostatnia zmiana: {formatDateTime(tournamentRosterPreview.roster.updated_at)}</span> : null}
                                                  {typeof tournamentRosterPreview.submission?.version === "number" ? <span>Wersja: {tournamentRosterPreview.submission.version}</span> : null}
                                                  {tournamentRosterPreview.submission?.submitted_by_name ? <span>Autor zgłoszenia: {tournamentRosterPreview.submission.submitted_by_name}</span> : null}
                                                  {tournamentRosterPreview.submission ? <span>Kod wydruku: {tournamentRosterPreview.submission.verification_code || "-"}</span> : null}
                                                </div>
                                              ) : null}

                                              <table className="min-w-full text-xs text-left text-gray-700">
                                                <thead className="text-xs uppercase text-gray-500">
                                                  <tr>
                                                    <th className="px-2 py-1.5">Slot</th>
                                                    <th className="px-2 py-1.5">Zawodnik</th>
                                                    <th className="px-2 py-1.5">Rocznik</th>
                                                    <th className="px-2 py-1.5">Nr licencji</th>
                                                    <th className="px-2 py-1.5">Wypożyczony z</th>
                                                    <th className="px-2 py-1.5">Status licencji</th>
                                                    {canApprove ? <th className="px-2 py-1.5 text-right">Akcja</th> : null}
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {tournamentRosterPreview.roster.players.map((entry) => {
                                                    const isVerifying = verifyingTournamentLicenseIds.has(entry.player.id);
                                                    return (
                                                      <tr key={entry.id} className="border-t border-slate-200 align-top">
                                                        <td className="px-2 py-1.5">{entry.slot}</td>
                                                        <td className="px-2 py-1.5">{entry.player.first_name} {entry.player.last_name}</td>
                                                        <td className="px-2 py-1.5">{entry.player.birth_year}</td>
                                                        <td className="px-2 py-1.5">{entry.player.license_number}</td>
                                                        <td className="px-2 py-1.5">{entry.player.loan_club_name || "-"}</td>
                                                        <td className="px-2 py-1.5">
                                                          <LicenseStatus
                                                            licenseStatus={entry.player.license_status}
                                                            licenseValidUntil={entry.player.license_verified_until || undefined}
                                                            targetDate={targetDate}
                                                            verifiedAt={entry.player.license_verified_at || undefined}
                                                            verifiedBy={entry.player.license_verified_by || undefined}
                                                          />
                                                        </td>
                                                        {canApprove ? (
                                                          <td className="px-2 py-1.5 text-right">
                                                            <button
                                                              onClick={() => void handleApproveTournamentPlayer(entry.player.id, tournament.id, club.club_name)}
                                                              disabled={isVerifying}
                                                              className={isVerifying ? "rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 text-xs text-gray-400 cursor-not-allowed" : "rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"}
                                                            >
                                                              Zatwierdź zawodnika
                                                            </button>
                                                          </td>
                                                        ) : null}
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>

                                            </>
                                          ) : null}

                                          {!loadingTournamentRosterPreview && isActivePreview && !tournamentRosterPreview?.roster ? (
                                            <div className="p-2 text-xs text-gray-500">Brak zapisanej listy meczowej dla tej drużyny.</div>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                                {(tournamentClubs.get(tournament.id) ?? []).length === 0 ? (
                                  <div className="text-xs text-gray-500">Brak zgłoszonych drużyn w tym turnieju.</div>
                                ) : null}
                              </div>
                            </div>

                            <CompetitionMatchesView
                              mode="tournament"
                              competitionSeasonId={selectedCompetitionSeason?.id ?? null}
                              stageId={stage.id}
                              tournamentId={tournament.id}
                              matches={state.matches.filter(m => m.tournamentId === tournament.id)}
                              penalties={penaltiesByMatch}
                              documents={state.matches.filter(m => m.tournamentId === tournament.id)}
                              currentUser={effectiveUser}
                              state={state}
                              setState={setState}
                              clubs={clubs}
                              refereeNames={refereeNames}
                              delegateNames={delegateNames}
                              delegateCandidateNames={delegateCandidateNames}
                              onRefreshMatches={refreshMatches}
                              loadingMatches={loadingMatches}
                              onRemovePenalty={handleRemovePenalty}
                              onQuickEdit={handleQuickEdit}
                              onCancelEdit={handleCancelInlineEdit}
                              editingMatchId={editingMatchId}
                              tournamentClubs={tournamentClubs}
                              showAddTournamentClubForm={showAddTournamentClubForm}
                              setShowAddTournamentClubForm={setShowAddTournamentClubForm}
                              tournamentClubFormData={tournamentClubFormData}
                              setTournamentClubFormData={setTournamentClubFormData}
                              onAddTournamentClub={handleAddTournamentClub}
                              onDeleteTournamentClub={handleDeleteTournamentClub}
                              onAddMatch={id => {
                                setSelectedTournamentForMatch(id);
                                setShowAddMatchForm(true);
                              }}
                              isAdmin={isAdmin}
                              renderMatchesTable={({ title, variant, sectionClassName, showExport, tableState, currentUser }) => (
                                <MatchesTable
                                  title={title}
                                  variant={variant}
                                  sectionClassName={sectionClassName}
                                  showExport={showExport}
                                  state={tableState}
                                  setState={setState}
                                  user={currentUser ?? null}
                                  onRefresh={refreshMatches}
                                  loading={loadingMatches}
                                  penaltyMap={penaltiesByMatch}
                                  onRemovePenalty={handleRemovePenalty}
                                  onQuickEdit={handleQuickEdit}
                                  clubs={clubs}
                                  refereeNames={refereeNames}
                                  delegateNames={delegateCandidateNames}
                                  editingMatchId={editingMatchId}
                                  onCancelEdit={handleCancelInlineEdit}
                                  removeWholeSlot={removeWholeSlot}
                                  renderExportImport={({ state, setState }) => <ExportImport state={state} setState={setState} />}
                                  renderMatchActionExtras={variant === "upcoming" ? renderMatchRosterActionExtras : undefined}
                                  renderMatchExpandedExtras={variant === "upcoming" ? renderMatchRosterExpandedExtras : undefined}
                                  renderAdminPanel={m => (
                                    <AdminPanel
                                      state={state}
                                      setState={setState}
                                      clubs={clubs}
                                      refereeNames={refereeNames}
                                      delegateNames={delegateCandidateNames}
                                      onAfterChange={() => {
                                        refreshMatches();
                                        handleCancelInlineEdit();
                                      }}
                                      canWrite={true}
                                      editingMatchId={m.id}
                                      clearEditing={handleCancelInlineEdit}
                                      compact
                                    />
                                  )}
                                />
                              )}
                              renderRankingTable={({ matches, clubs }) => <RankingTable matches={matches} clubs={clubs as string[]} />}
                              renderCompetitionAdminPanel={() => (
                                <AdminPanel
                                  state={state}
                                  setState={setState}
                                  clubs={clubs}
                                  refereeNames={refereeNames}
                                  delegateNames={delegateCandidateNames}
                                  onAfterChange={() => {
                                    refreshMatches();
                                  }}
                                  canWrite={true}
                                  editingMatchId={editingMatchId}
                                  clearEditing={handleCancelInlineEdit}
                                />
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500 ml-2">Brak turniejów w tym etapie</div>
                    )}

                    {effectiveUser && isAdmin(effectiveUser) && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setSelectedStageForTournament(stage.id);
                            setShowAddTournamentForm(true);
                          }}
                          className="rounded-lg px-2 py-1 text-sm text-[#058CFF] transition hover:bg-sky-50"
                        >
                          + Dodaj turniej
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {effectiveUser && isAdmin(effectiveUser) && (
            <div>
              {!showAddStageForm ? (
                <button
                  onClick={() => setShowAddStageForm(true)}
                  className="rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2 font-medium text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]"
                >
                  + Dodaj etap
                </button>
              ) : (
                <StageForm
                  stageFormData={stageFormData}
                  setStageFormData={setStageFormData}
                  onSubmit={handleAddStage}
                  onCancel={() => {
                    setShowAddStageForm(false);
                    setStageFormData({ name: "", type: "round_robin", startDate: "", endDate: "" });
                  }}
                />
              )}
            </div>
          )}

          {effectiveUser && isAdmin(effectiveUser) && showAddTournamentForm && selectedStageForTournament && (
            <TournamentForm
              stages={stages}
              selectedStageForTournament={selectedStageForTournament}
              setSelectedStageForTournament={setSelectedStageForTournament}
              tournamentFormData={tournamentFormData}
              setTournamentFormData={setTournamentFormData}
              onSubmit={handleAddTournament}
              onCancel={() => {
                setShowAddTournamentForm(false);
                setSelectedStageForTournament(null);
                setTournamentFormData({ name: "", type: "league", startDate: "", endDate: "" });
              }}
            />
          )}

          {effectiveUser && isAdmin(effectiveUser) && showAddMatchForm && selectedTournamentForMatch && (
            <MatchForm
              matchFormData={matchFormData}
              setMatchFormData={setMatchFormData}
              tournamentClubs={tournamentClubs}
              selectedTournamentForMatch={selectedTournamentForMatch}
              refereeNames={refereeNames}
              delegateNames={delegateNames}
              onSubmit={handleAddMatch}
              onCancel={() => {
                setShowAddMatchForm(false);
                setSelectedTournamentForMatch(null);
                setMatchFormData({
                  date: "",
                  time: "",
                  location: "",
                  round: "",
                  series_round: "",
                  home: "",
                  away: "",
                  referee1: "",
                  referee2: "",
                  delegate: "",
                });
              }}
            />
          )}
        </div>
      )}
    </>
  );
};
