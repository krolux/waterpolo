import { supabase } from "./supabase";

export type PublicPlayerMatch = {
  id: string;
  date: string;
  home: string;
  away: string;
  result: string;
  club: string;
  goals: number;
  exclusions: number;
};

export type PublicPlayerStatistics = {
  playerId: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  categoryId: string | null;
  categoryName: string;
  club: string;
  registeredClub: string | null;
  registeredClubLogo: string | null;
  isLoan: boolean;
  matchesPlayed: number;
  goals: number;
  exclusions: number;
  matches: PublicPlayerMatch[];
};

export async function listPublicPlayerStatistics(): Promise<PublicPlayerStatistics[]> {
  const { data, error } = await supabase.rpc("search_public_player_statistics", {
    search_text: null,
    club_filter: null,
    birth_year_filter: null,
    player_id_filter: null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data as PublicPlayerStatistics[] : [];
}

