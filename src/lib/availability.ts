import { supabase } from "./supabase";

/** Ustaw/zmień dostępność zalogowanego sędziego dla meczu */
export async function setMyAvailability(matchId: string, available: boolean, note?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nie zalogowany");

  const upsertRow = {
    match_id: matchId,
    referee_id: user.id,
    available,
    note: note ?? null,
  };

  const { error } = await supabase
    .from("match_availability")
    .upsert(upsertRow, { onConflict: "match_id,referee_id" });

  if (error) throw error;
}

/** Pobierz moją dostępność (do zaznaczenia ✅/❌ przy każdym meczu) */
export async function getMyAvailabilityForMatches(matchIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || matchIds.length === 0) return new Map<string, boolean>();

  const { data, error } = await supabase
    .from("match_availability")
    .select("match_id, available")
    .eq("referee_id", user.id)
    .in("match_id", matchIds);

  if (error) throw error;
  return new Map(data.map(r => [r.match_id, !!r.available]));
}

/** Lista dostępnych sędziów (id + nazwa) dla jednego meczu – do panelu admina */
export async function listAvailableReferees(matchId: string): Promise<{id:string; name:string}[]> {
  const { data, error } = await supabase
    .from("match_availability")
    .select(`
      referee_id,
      profiles!inner ( display_name, role )
    `)
    .eq("match_id", matchId)
    .eq("available", true);

  if (error) throw error;
  return (data || [])
    .filter((r: any) => r.profiles?.role === "Referee" || r.profiles?.role === "Admin") // Admin też może sędziować? usuń jeśli nie.
    .map((r: any) => ({ id: r.referee_id, name: r.profiles.display_name }));
}
