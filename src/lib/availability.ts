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

/**
 * Pobierz moją dostępność dla wielu meczów (tri-state):
 *  true  = dostępny,
 *  false = niedostępny,
 *  null  = brak decyzji
 *
 * UI może traktować null jako "niedostępny" logicznie, ale graficznie
 * podkreślamy, że decyzji jeszcze nie było.
 */
export async function getMyAvailabilityForMatches(matchIds: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || matchIds.length === 0) {
    // zwracamy pustą mapę; UI może wtedy domyślnie ustawić false + myAvailabilitySet=false
    return new Map<string, boolean | null>();
  }

  const { data, error } = await supabase
    .from("match_availability")
    .select("match_id, available")
    .eq("referee_id", user.id)
    .in("match_id", matchIds);

  if (error) throw error;

  // Zainicjuj wszystkie mecze jako "brak decyzji"
  const map = new Map<string, boolean | null>();
  for (const id of matchIds) map.set(id, null);

  // Wstaw faktyczne wartości tam, gdzie istnieje wpis
  for (const row of data || []) {
    map.set(row.match_id, !!row.available);
  }

  return map;
}

/** Lista dostępnych sędziów (id + nazwa) dla jednego meczu – np. do podglądu w panelu admina */
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
    .filter((r: any) => r.profiles?.role === "Referee" || r.profiles?.role === "Admin") // usuń Admin, jeśli nie chcesz
    .map((r: any) => ({ id: r.referee_id, name: r.profiles.display_name }));
}

/**
 * Zestaw nazwisk sędziów dostępnych na dany mecz – do oznaczania "✓" w selectach.
 * (tylko nazwy, bo w Twoim AdminPanelu używasz listy display_name)
 */
export async function namesOfAvailableReferees(matchId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("match_availability")
    .select(`
      available,
      profiles!inner ( display_name, role )
    `)
    .eq("match_id", matchId)
    .eq("available", true);

  if (error) throw error;

  const set = new Set<string>();
  for (const row of data || []) {
    const name = (row as any)?.profiles?.display_name as string | undefined;
    const role = (row as any)?.profiles?.role as string | undefined;
    if (!name) continue;
    if (role === "Referee" || role === "Admin") set.add(name);
  }
  return set;
}
