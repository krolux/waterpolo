import { supabase } from "./supabase"

export type Penalty = {
  id: string
  match_id: string
  club_name: string
  player_name: string
  games: number
  created_by: string
  created_at: string
}

// Dodaj nową karę
export async function addPenalty(matchId: string, clubName: string, playerName: string, games: number) {
  const { data, error } = await supabase
    .from("penalties")
    .insert([{ match_id: matchId, club_name: clubName, player_name: playerName, games }])
    .select()
    .single()
  if (error) throw error
  return data as Penalty
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
