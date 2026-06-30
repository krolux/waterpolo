import { useCallback, useEffect, useState } from "react";
import {
  addStage,
  addTournament,
  addTournamentClub,
  addTournamentMatch,
  deleteStage,
  deleteTournament,
  deleteTournamentClub,
  deleteTournamentMatch,
  listStages,
  listTournamentClubs,
  listTournaments,
  type Competition,
  type CompetitionSeason,
  type Stage,
  type Tournament,
  type TournamentClub,
} from "../lib/competitions";

type StageFormData = {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
};

type TournamentFormData = {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
};

type MatchFormData = {
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

type UseTournamentManagementArgs = {
  selectedCompetitionSeason: CompetitionSeason | null;
  competitions: Competition[];
  refreshMatches: () => Promise<void> | void;
};

export function useTournamentManagement({
  selectedCompetitionSeason,
  competitions,
  refreshMatches,
}: UseTournamentManagementArgs) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [tournaments, setTournaments] = useState<Map<string, Tournament[]>>(new Map());
  const [loadingStages, setLoadingStages] = useState(false);

  const [showAddStageForm, setShowAddStageForm] = useState(false);
  const [stageFormData, setStageFormData] = useState<StageFormData>({
    name: "",
    type: "round_robin",
    startDate: "",
    endDate: "",
  });

  const [showAddTournamentForm, setShowAddTournamentForm] = useState(false);
  const [selectedStageForTournament, setSelectedStageForTournament] = useState<string | null>(null);
  const [tournamentFormData, setTournamentFormData] = useState<TournamentFormData>({
    name: "",
    type: "league",
    startDate: "",
    endDate: "",
  });

  const [showAddMatchForm, setShowAddMatchForm] = useState(false);
  const [selectedTournamentForMatch, setSelectedTournamentForMatch] = useState<string | null>(null);
  const [matchFormData, setMatchFormData] = useState<MatchFormData>({
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

  const [tournamentClubs, setTournamentClubs] = useState<Map<string, TournamentClub[]>>(new Map());
  const [showAddTournamentClubForm, setShowAddTournamentClubForm] = useState(false);
  const [tournamentClubFormData, setTournamentClubFormData] = useState({ clubName: "" });

  const refreshTournamentClubs = useCallback(async (tournamentId: string) => {
    try {
      const clubs = await listTournamentClubs(tournamentId);
      setTournamentClubs(prev => new Map(prev).set(tournamentId, clubs));
    } catch (e) {
      console.warn("[refreshTournamentClubs] error", e);
    }
  }, []);

  const refreshStages = useCallback(async () => {
    if (!selectedCompetitionSeason) return;

    setLoadingStages(true);
    try {
      const stagesList = await listStages(selectedCompetitionSeason.id);
      setStages(stagesList);

      const tournamentsMap = new Map<string, Tournament[]>();

      for (const stage of stagesList) {
        const tourns = await listTournaments(stage.id);
        tournamentsMap.set(stage.id, tourns);
      }
      setTournaments(tournamentsMap);

      await Promise.all(Array.from(tournamentsMap.values()).flat().map(t => refreshTournamentClubs(t.id)));
    } catch (e) {
      console.warn("[refreshStages] error", e);
    }
    setLoadingStages(false);
  }, [selectedCompetitionSeason, refreshTournamentClubs]);

  useEffect(() => {
    if (selectedCompetitionSeason && selectedCompetitionSeason.competition_id !== competitions.find(c => c.name === "Ekstraklasa")?.id) {
      refreshStages();
    }
  }, [selectedCompetitionSeason, competitions, refreshStages]);

  useEffect(() => {
    if (!selectedTournamentForMatch) return;
    refreshTournamentClubs(selectedTournamentForMatch);
  }, [selectedTournamentForMatch, refreshTournamentClubs]);

  const handleAddStage = async () => {
    if (!selectedCompetitionSeason || !stageFormData.name.trim()) return;

    try {
      await addStage(
        selectedCompetitionSeason.id,
        stageFormData.name.trim(),
        stageFormData.type,
        stageFormData.startDate,
        stageFormData.endDate
      );

      setStageFormData({ name: "", type: "round_robin", startDate: "", endDate: "" });
      setShowAddStageForm(false);
      await refreshStages();
    } catch (e) {
      console.error("[handleAddStage] error", e);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten etap?")) return;

    try {
      await deleteStage(stageId);
      await refreshStages();
    } catch (e) {
      console.error("[handleDeleteStage] error", e);
    }
  };

  const handleAddTournament = async () => {
    if (!selectedStageForTournament || !tournamentFormData.name.trim()) return;

    try {
      await addTournament(
        selectedStageForTournament,
        tournamentFormData.name.trim(),
        tournamentFormData.type,
        tournamentFormData.startDate,
        tournamentFormData.endDate
      );

      setTournamentFormData({ name: "", type: "league", startDate: "", endDate: "" });
      setShowAddTournamentForm(false);
      setSelectedStageForTournament(null);
      await refreshStages();
    } catch (e) {
      console.error("[handleAddTournament] error", e);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten turniej?")) return;

    try {
      await deleteTournament(tournamentId);
      await refreshStages();
    } catch (e) {
      console.error("[handleDeleteTournament] error", e);
    }
  };

  const handleAddTournamentClub = async (tournamentId: string) => {
    if (!tournamentClubFormData.clubName.trim()) return;

    try {
      await addTournamentClub(tournamentId, tournamentClubFormData.clubName.trim());
      setTournamentClubFormData({ clubName: "" });
      await refreshTournamentClubs(tournamentId);
    } catch (e) {
      console.error("[handleAddTournamentClub] error", e);
    }
  };

  const handleDeleteTournamentClub = async (clubId: string, tournamentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten klub z turnieju?")) return;

    try {
      await deleteTournamentClub(clubId);
      await refreshTournamentClubs(tournamentId);
    } catch (e) {
      console.error("[handleDeleteTournamentClub] error", e);
    }
  };

  const handleAddMatch = async () => {
    if (!selectedTournamentForMatch) {
      alert("Wybierz turniej przed dodaniem meczu.");
      return;
    }

    const clubsForCurrentTournament = tournamentClubs.get(selectedTournamentForMatch) ?? [];
    if (clubsForCurrentTournament.length === 0) {
      alert("Najpierw dodaj drużyny do turnieju.");
      return;
    }

    if (!matchFormData.date.trim() || !matchFormData.location.trim() || !matchFormData.home.trim() || !matchFormData.away.trim()) {
      alert("Wypełnij wszystkie pola: datę, miejsce, gospodarza i gości");
      return;
    }

    if (matchFormData.home === matchFormData.away) {
      alert("Gospodarz i goście muszą być różnymi klubami");
      return;
    }

    if (matchFormData.referee1 && matchFormData.referee1 === matchFormData.referee2) {
      alert("Sędzia 1 i Sędzia 2 nie mogą być tacy sami");
      return;
    }

    try {
      const stage = stages.find(s => tournaments.get(s.id)?.find(t => t.id === selectedTournamentForMatch));
      if (!stage || !selectedCompetitionSeason) return;

      await addTournamentMatch(selectedTournamentForMatch, stage.id, selectedCompetitionSeason.id, {
        date: matchFormData.date,
        time: matchFormData.time || undefined,
        location: matchFormData.location,
        round: matchFormData.round || undefined,
        series_round: matchFormData.series_round || undefined,
        home: matchFormData.home,
        away: matchFormData.away,
        referee1: matchFormData.referee1 || undefined,
        referee2: matchFormData.referee2 || undefined,
        delegate: matchFormData.delegate || undefined,
      });

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
      setShowAddMatchForm(false);
      setSelectedTournamentForMatch(null);
      await refreshMatches();
      await refreshStages();
    } catch (e) {
      console.error("[handleAddMatch] error", e);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten mecz?")) return;

    try {
      await deleteTournamentMatch(matchId);
      await refreshMatches();
      await refreshStages();
    } catch (e) {
      console.error("[handleDeleteMatch] error", e);
    }
  };

  return {
    stages,
    tournaments,
    loadingStages,
    tournamentClubs,
    showAddStageForm,
    setShowAddStageForm,
    stageFormData,
    setStageFormData,
    showAddTournamentForm,
    setShowAddTournamentForm,
    selectedStageForTournament,
    setSelectedStageForTournament,
    tournamentFormData,
    setTournamentFormData,
    showAddMatchForm,
    setShowAddMatchForm,
    selectedTournamentForMatch,
    setSelectedTournamentForMatch,
    matchFormData,
    setMatchFormData,
    showAddTournamentClubForm,
    setShowAddTournamentClubForm,
    tournamentClubFormData,
    setTournamentClubFormData,
    refreshStages,
    refreshTournamentClubs,
    handleAddStage,
    handleDeleteStage,
    handleAddTournament,
    handleDeleteTournament,
    handleAddTournamentClub,
    handleDeleteTournamentClub,
    handleAddMatch,
    handleDeleteMatch,
  };
}