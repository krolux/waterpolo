import { supabase } from "./supabase";

/**
 * Ustaw/zmień dostępność zalogowanego sędziego dla meczu.
 * Zapis idempotentny (UPSERT po kluczu złożonym: match_id + referee_id).
 */
export async function setMyAvailability(
  matchId: string,
  available: boolean,
  note?: string
) {
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
 * Pobierz moją dostępność dla wielu meczów.
 * Zwraca Mapę: match_id -> true/false
 * Brak wpisu = undefined (MAP.get() zwróci undefined).
 *
 * UWAGA: brak już wartości null – to upraszcza logikę w App:
 *   myAvailable: v === true ? true : false
 *   myAvailabilitySet: v !== undefined
 */
export async function getMyAvailabilityForMatches(
  matchIds: string[]
): Promise<Map<string, boolean>> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || matchIds.length === 0) {
    return new Map<string, boolean>();
  }

  const { data, error } = await supabase
    .from("match_availability")
    .select("match_id, available")
    .eq("referee_id", user.id)
    .in("match_id", matchIds);

  if (error) throw error;

  return new Map<string, boolean>(
    (data || []).map(r => [r.match_id as string, !!r.available])
  );
}

/**
 * Lista dostępnych sędziów (id + nazwa) dla jednego meczu – do podglądu w panelu admina.
 */
export async function listAvailableReferees(
  matchId: string
): Promise<{ id: string; name: string }[]> {
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
    .filter((r: any) =>
      r.profiles?.role === "Referee" || r.profiles?.role === "Admin"
    )
    .map((r: any) => ({
      id: r.referee_id as string,
      name: r.profiles.display_name as string,
    }));
}

/**
 * Zestaw nazwisk sędziów dostępnych na dany mecz – do oznaczania "✓" w selectach.
 * (Zwraca tylko nazwy, bo w AdminPanelu operujesz na display_name.)
 */
export async function namesOfAvailableReferees(
  matchId: string
): Promise<Set<string>> {
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
