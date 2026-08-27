import { supabase } from "./supabase";

export type ProtocolStatLeader = { playerId: string; playerName: string; club: string; value: number };
export type PublishedProtocolStats = {
  ekstraklasaReady: boolean;
  allReady: boolean;
  leaders: Record<string, ProtocolStatLeader[]>;
};

export async function loadPublishedProtocolStats(): Promise<PublishedProtocolStats> {
  const { data, error } = await supabase.rpc("get_published_protocol_stats");
  if (error) throw error;
  const value = (data || {}) as Partial<PublishedProtocolStats>;
  return {
    ekstraklasaReady: !!value.ekstraklasaReady,
    allReady: !!value.allReady,
    leaders: value.leaders || {},
  };
}
