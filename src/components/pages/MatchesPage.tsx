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
import type { Competition, CompetitionSeason, Stage, Tournament, TournamentClub } from "../../lib/competitions";
import type { AppState, Role } from "../../types/wpolo";
import type { SaveRosterPayload } from "../../types/rosters";

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
  savedRosters: SaveRosterPayload[];
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
  savedRosters,
}) => {
  const [openRosterPreview, setOpenRosterPreview] = React.useState<{ tournamentId: string; clubName: string } | null>(null);
  const [approvedPlayers, setApprovedPlayers] = React.useState<Set<string>>(new Set());
  const canApprove = !!effectiveUser && ["Referee", "Delegate", "Admin"].includes(effectiveUser.role);

  const toggleApproved = React.useCallback((key: string) => {
    setApprovedPlayers((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <>
      <div className="rounded-2xl border border-white/40 bg-white/80 p-3 shadow-sm mb-4">
        <div className="mb-2 text-sm font-semibold text-gray-700">Kategoria rozgrywek:</div>
        <div className="flex flex-wrap gap-2">
          {(competitions.length ? competitions : fallbackCompetitions).map(comp => (
            <button
              key={comp.id}
              onClick={() => handleCompetitionChange(comp.id)}
              className={
                "px-3 py-2 rounded-xl border text-sm font-medium transition " +
                (selectedCompetitionId === comp.id
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
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
              user={currentUser ?? undefined}
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
          <Section title={selectedCompetitionSeason?.name || "Kategoria"} icon={<Shield className="w-5 h-5" />} className="bg-white/60">
            {loadingStages ? (
              <div className="text-gray-500">Ładowanie etapów...</div>
            ) : stages.length === 0 ? (
              <div className="text-gray-500">Brak etapów. {effectiveUser && isAdmin(effectiveUser) && "Dodaj pierwszy etap."}</div>
            ) : (
              <div className="space-y-4">
                {stages.map(stage => (
                  <div key={stage.id} className="border-l-4 border-amber-600 pl-4 py-3 bg-amber-50 rounded">
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
                          <div key={tournament.id} className="bg-white border border-gray-200 rounded">
                            <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
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

                            <div className="p-3 border-b border-gray-200 bg-white">
                              <div className="mb-2 text-sm font-semibold text-slate-700">Drużyny zgłoszone do turnieju</div>
                              <div className="space-y-2">
                                {(tournamentClubs.get(tournament.id) ?? []).map((club) => {
                                  const previewOpen = openRosterPreview?.tournamentId === tournament.id && openRosterPreview?.clubName === club.club_name;
                                  const roster = savedRosters.find((item) =>
                                    item.mode === "tournament" &&
                                    item.tournamentId === tournament.id &&
                                    item.clubName === club.club_name
                                  );

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
                                              {(roster?.players ?? []).map((player) => {
                                                const approveKey = `${tournament.id}:${club.club_name}:${player.playerId}`;
                                                const approved = approvedPlayers.has(approveKey);
                                                return (
                                                  <tr key={approveKey} className="border-t border-slate-200 align-top">
                                                    <td className="px-2 py-1.5">{player.slot}</td>
                                                    <td className="px-2 py-1.5">{player.fullName}</td>
                                                    <td className="px-2 py-1.5">{player.birthYear}</td>
                                                    <td className="px-2 py-1.5">{player.licenseNumber}</td>
                                                    <td className="px-2 py-1.5">{player.loanClub || "-"}</td>
                                                    <td className="px-2 py-1.5">{player.licenseStatus}</td>
                                                    {canApprove ? (
                                                      <td className="px-2 py-1.5 text-right">
                                                        <button
                                                          onClick={() => toggleApproved(approveKey)}
                                                          className={approved ? "rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700" : "rounded-lg border bg-white px-2 py-1 text-xs hover:bg-gray-50"}
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
                                          {!roster || roster.players.length === 0 ? (
                                            <div className="p-2 text-xs text-gray-500">Brak zapisanej listy dla tej drużyny.</div>
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
                                  user={currentUser ?? undefined}
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
                          className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
