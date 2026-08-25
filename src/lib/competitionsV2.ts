import { supabase } from "./supabase";
import { fromMatchDbRow, type DbMatchRow } from "./matches";
import type { Competition, CompetitionSeason, Stage, Tournament, TournamentClub } from "./competitions";

export const COMPETITION_CODES = ["EKS", "PP", "POL", "U23", "U19", "U17", "U15", "U13"] as const;
export type CompetitionCode = (typeof COMPETITION_CODES)[number];

export const COMPETITION_LABELS: Record<CompetitionCode, string> = {
  EKS: "EKS",
  PP: "PP",
  POL: "Reprezentacja Polski",
  U23: "U23",
  U19: "U19",
  U17: "U17",
  U15: "U15",
  U13: "U13",
};

export type CompetitionContextV2 = {
  competition: Competition | null;
  season: CompetitionSeason | null;
  stages: Stage[];
  tournaments: Tournament[];
  tournamentClubs: TournamentClub[];
  matches: DbMatchRow[];
};

const codeOf = (competition: Competition) => {
  if (/reprezentacja polski|kadra polski/i.test(competition.name)) return "POL";
  return (competition.short_name || (competition.name === "Ekstraklasa" ? "EKS" : competition.name)).toUpperCase();
};

export async function loadCompetitionsV2(): Promise<Competition[]> {
  const { data, error } = await supabase.from("competitions").select("*").eq("active", true);
  if (error) throw error;
  return COMPETITION_CODES.flatMap(code => {
    const found = (data || []).find(row => codeOf(row as Competition) === code);
    return found ? [found as Competition] : [];
  });
}

export async function loadCompetitionContextV2(code: CompetitionCode): Promise<CompetitionContextV2> {
  const competitions = await loadCompetitionsV2();
  const competition = competitions.find(item => codeOf(item) === code) ?? null;
  if (!competition) return { competition: null, season: null, stages: [], tournaments: [], tournamentClubs: [], matches: [] };

  const { data: seasonRows, error: seasonError } = await supabase
    .from("competition_seasons").select("*").eq("competition_id", competition.id)
    .order("start_date", { ascending: false });
  if (seasonError) throw seasonError;
  const seasons = (seasonRows || []) as CompetitionSeason[];
  const season = seasons.find(item => item.status === "active") || seasons.find(item => item.status === "in_progress") || seasons[0] || null;

  let stages: Stage[] = [];
  let tournaments: Tournament[] = [];
  let tournamentClubs: TournamentClub[] = [];
  if (season) {
    const { data, error } = await supabase.from("stages").select("*").eq("competition_season_id", season.id).order("sort_order");
    if (error) throw error;
    stages = (data || []) as Stage[];
    if (stages.length) {
      const { data: tournamentRows, error: tournamentError } = await supabase
        .from("tournaments").select("*").in("stage_id", stages.map(item => item.id)).order("start_date");
      if (tournamentError) throw tournamentError;
      tournaments = (tournamentRows || []) as Tournament[];
      if (tournaments.length) {
        const { data: clubRows, error: clubsError } = await supabase
          .from("tournament_clubs").select("*").in("tournament_id", tournaments.map(item => item.id)).order("club_name");
        if (clubsError) throw clubsError;
        tournamentClubs = (clubRows || []) as TournamentClub[];
      }
    }
  }

  let seasonIds: string[] = [];
  if (season) {
    seasonIds = [season.id];
  } else if (seasons.length > 0) {
    seasonIds = seasons.map(item => item.id);
  }

  let matches: DbMatchRow[] = [];
  if (seasonIds.length > 0) {
    const { data: rows, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .in("competition_season_id", seasonIds)
      .order("date", { ascending: false });
    if (matchesError) throw matchesError;
    matches = (rows || []).map(row => fromMatchDbRow(row as Record<string, unknown>));
  }

  return { competition, season, stages, tournaments, tournamentClubs, matches };
}

export async function createPolishNationalTeamCompetition(): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("competitions")
    .select("id")
    .or("short_name.eq.POL,name.ilike.Reprezentacja Polski")
    .maybeSingle();
  if (existingError) throw existingError;
  let competitionId = existing?.id as string | undefined;
  if (!competitionId) {
    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .insert({
        name: "Reprezentacja Polski",
        short_name: "POL",
        type: "national_team",
        level: "senior",
        gender: "mixed",
        country: "PL",
        active: true,
        description: "Kalendarz meczów reprezentacji Polski",
      })
      .select("id")
      .single();
    if (competitionError) throw competitionError;
    competitionId = competition.id;
  }

  const { data: currentSeason, error: currentSeasonError } = await supabase
    .from("competition_seasons")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("status", "active")
    .maybeSingle();
  if (currentSeasonError) throw currentSeasonError;
  if (currentSeason?.id) return;

  const { data: referenceSeason, error: seasonLookupError } = await supabase
    .from("competition_seasons")
    .select("season_id,start_date,end_date")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (seasonLookupError) throw seasonLookupError;
  if (!referenceSeason?.season_id) return;

  const startYear = new Date(referenceSeason.start_date).getFullYear();
  const endYear = new Date(referenceSeason.end_date).getFullYear();
  const { error: seasonError } = await supabase.from("competition_seasons").insert({
    competition_id: competitionId,
    season_id: referenceSeason.season_id,
    name: `Reprezentacja Polski ${startYear}/${endYear}`,
    status: "active",
    start_date: referenceSeason.start_date,
    end_date: referenceSeason.end_date,
  });
  if (seasonError) throw seasonError;
}
