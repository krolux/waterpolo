import { supabase } from "./supabase"

export type Penalty = {
  id: string
  match_id: string
  club_name: string
  player_name: string
  games: number
  created_by: string
  created_at: string
  player_id?: string | null
  competition_season_id?: string | null
  source_event_id?: string | null
}

// Dodaj nową karę
export async function addPenalty(matchId: string, clubName: string, playerName: string, games: number, competitionSeasonId?: string | null) {
  let playerId: string | null = null;
  const { data: club } = await supabase.from("clubs").select("id").eq("name", clubName).maybeSingle();
  if (club?.id) {
    const { data: players } = await supabase.from("players").select("id,first_name,last_name").eq("club_id", club.id);
    const wanted = playerName.trim().toLocaleLowerCase("pl-PL");
    const player = (players || []).find(row => `${row.first_name} ${row.last_name}`.trim().toLocaleLowerCase("pl-PL") === wanted);
    playerId = player?.id || null;
  }
  const { data, error } = await supabase
    .from("penalties")
    .insert([{ match_id: matchId, club_name: clubName, player_name: playerName, games, player_id: playerId, competition_season_id: competitionSeasonId || null, source_event_id: `manual-${crypto.randomUUID()}` }])
    .select()
    .single()
  if (error) throw error
  return data as Penalty
}

export async function addProtocolPenalty(payload: {
  matchId: string;
  clubName: string;
  playerName: string;
  playerId: string;
  competitionSeasonId: string | null;
  sourceEventId: string;
  games: number;
}) {
  const { data, error } = await supabase.from("penalties").upsert({
    match_id: payload.matchId,
    club_name: payload.clubName,
    player_name: payload.playerName,
    player_id: payload.playerId,
    competition_season_id: payload.competitionSeasonId,
    source_event_id: payload.sourceEventId,
    games: payload.games,
  }, { onConflict: "match_id,source_event_id" }).select().single();
  if (error) throw error;
  return data as Penalty;
}

export async function countPriorPlayerSuspensions(playerId: string, competitionSeasonId: string | null, excludeMatchId?: string): Promise<number> {
  let query = supabase.from("penalties").select("id", { count: "exact", head: true }).eq("player_id", playerId);
  query = competitionSeasonId ? query.eq("competition_season_id", competitionSeasonId) : query.is("competition_season_id", null);
  if (excludeMatchId) query = query.neq("match_id", excludeMatchId);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

// Pobierz wszystkie kary
export async function listPenalties(): Promise<Penalty[]> {
  const { data, error } = await supabase
    .from("penalties")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data || []) as Penalty[]
}
export async function deletePenalty(id: string) {
  const { error } = await supabase.from('penalties').delete().eq('id', id);
  if (error) throw error;
}
