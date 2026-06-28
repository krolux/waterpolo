import { supabase } from './supabase';

export type Competition = {
  id: string;
  name: string;
  short_name: string | null;
  type: string;
  level: string;
  gender: string;
  country: string;
  active: boolean;
  description: string | null;
  created_at: string;
};

export type CompetitionSeason = {
  id: string;
  competition_id: string;
  season_id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

/**
 * Pobierz wszystkie aktywne competitions
 */
export async function listCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as Competition[];
}

/**
 * Pobierz wszystkie competition_seasons dla danego sezonu
 */
export async function listCompetitionSeasons(seasonId: string): Promise<CompetitionSeason[]> {
  const { data, error } = await supabase
    .from('competition_seasons')
    .select('*')
    .eq('season_id', seasonId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as CompetitionSeason[];
}

/**
 * Pobierz competition season dla danej competition w danym sezonie
 */
export async function getCompetitionSeason(
  competitionId: string,
  seasonId: string
): Promise<CompetitionSeason | null> {
  const { data, error } = await supabase
    .from('competition_seasons')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('season_id', seasonId)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as CompetitionSeason | null;
}

export type Stage = {
  id: string;
  competition_season_id: string;
  name: string;
  stage_type: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
};

export type Tournament = {
  id: string;
  stage_id: string;
  name: string;
  venue_id: string | null;
  start_date: string | null;
  end_date: string | null;
  tournament_type: string;
  status: string;
  created_at: string;
};

/**
 * Pobierz wszystkie etapy dla competition_season
 */
export async function listStages(competitionSeasonId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('competition_season_id', competitionSeasonId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []) as Stage[];
}

/**
 * Pobierz wszystkie turnieje dla danego etapu
 */
export async function listTournaments(stageId: string): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('stage_id', stageId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []) as Tournament[];
}

/**
 * Dodaj nowy etap
 */
export async function addStage(
  competitionSeasonId: string,
  name: string,
  stageType: string,
  startDate: string,
  endDate: string
): Promise<Stage> {
  const { data, error } = await supabase
    .from('stages')
    .insert([
      {
        competition_season_id: competitionSeasonId,
        name,
        stage_type: stageType,
        sort_order: 0,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'planned',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return (data || {}) as Stage;
}

/**
 * Dodaj nowy turniej
 */
export async function addTournament(
  stageId: string,
  name: string,
  tournamentType: string,
  startDate: string,
  endDate: string
): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([
      {
        stage_id: stageId,
        name,
        tournament_type: tournamentType,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'planned',
        venue_id: null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return (data || {}) as Tournament;
}

/**
 * Usuń etap
 */
export async function deleteStage(stageId: string): Promise<void> {
  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);

  if (error) throw error;
}

/**
 * Usuń turniej
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId);

  if (error) throw error;
}

export type TournamentMatch = {
  id: string;
  tournament_id: string;
  stage_id: string;
  competition_season_id: string;
  date: string;
  time: string | null;
  round: string | null;
  series_round: string | null;
  location: string;
  home: string;
  away: string;
  result: string | null;
  referee1: string | null;
  referee2: string | null;
  delegate: string | null;
  created_at: string;
};

/**
 * Pobierz mecze dla danego turnieju
 */
export async function listTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data || []) as TournamentMatch[];
}

/**
 * Dodaj mecz do turnieju
 */
export async function addTournamentMatch(
  tournamentId: string,
  stageId: string,
  competitionSeasonId: string,
  data: {
    date: string;
    time?: string;
    round?: string;
    series_round?: string;
    location: string;
    home: string;
    away: string;
    referee1?: string;
    referee2?: string;
    delegate?: string;
  }
): Promise<TournamentMatch> {
  const { data: result, error } = await supabase
    .from('matches')
    .insert([
      {
        tournament_id: tournamentId,
        stage_id: stageId,
        competition_season_id: competitionSeasonId,
        date: data.date,
        time: data.time || null,
        round: data.round || null,
        series_round: data.series_round || null,
        location: data.location,
        home: data.home,
        away: data.away,
        referee1: data.referee1 || null,
        referee2: data.referee2 || null,
        delegate: data.delegate || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return (result || {}) as TournamentMatch;
}

/**
 * Usuń mecz z turnieju
 */
export async function deleteTournamentMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);

  if (error) throw error;
}

export type TournamentClub = {
  id: string;
  tournament_id: string;
  club_name: string;
  created_at: string;
};

export async function listTournamentClubs(tournamentId: string): Promise<TournamentClub[]> {
  const { data, error } = await supabase
    .from('tournament_clubs')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('club_name', { ascending: true });

  if (error) throw error;
  return (data || []) as TournamentClub[];
}

export async function addTournamentClub(
  tournamentId: string,
  clubName: string
): Promise<TournamentClub> {
  const { data, error } = await supabase
    .from('tournament_clubs')
    .insert([
      {
        tournament_id: tournamentId,
        club_name: clubName,
      },
    ])
    .select('*')
    .single();

  if (error) throw error;
  return (data || {}) as TournamentClub;
}

export async function deleteTournamentClub(tournamentClubId: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_clubs')
    .delete()
    .eq('id', tournamentClubId);

  if (error) throw error;
}
