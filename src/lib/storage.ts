import { supabase } from "./supabase";

export type DocKind = "comms" | "roster" | "report" | "photos";

/**
 * Konwencja ścieżek w bucket 'docs':
 * docs/<kind>/<matchId>/<clubOrNeutral>/<filename>
 * - kind: comms|roster|report|photos
 * - clubOrNeutral: nazwa klubu dla comms/roster, 'neutral' dla report/photos
 */

// prosty sanitizer
function safe(s: string) {
  return (s || "").replace(/\//g, "-").replace(/ /g, "_");
}

// ⬇️ DODANE: super-unikalny sufiks: znacznik czasu + UUID
function uniqueSuffix() {
  // crypto.randomUUID jest w nowoczesnych przeglądarkach; fallback gdyby co
  const uuid = (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${Date.now()}_${uuid}`;
}

function makePath(kind: DocKind, matchId: string, clubOrNeutral: string, fileName: string) {
  return `${kind}/${safe(matchId)}/${safe(clubOrNeutral)}/${uniqueSuffix()}_${safe(fileName)}`;
}

export async function uploadDoc(kind: DocKind, matchId: string, clubOrNeutral: string, file: File) {
  const path = makePath(kind, matchId, clubOrNeutral, file.name);

  // ⬇️ ZMIANA: upsert: true – nawet gdy backend uzna, że coś „istnieje”,
  // nie zablokuje zapisu (a my i tak mamy unikalną nazwę).
  const { data, error } = await supabase.storage.from("docs").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw new Error(error.message);
  return data?.path as string; // zwracamy ścieżkę w buckecie
}

export async function getSignedUrl(path: string, expiresInSec = 60 * 60) {
  const { data, error } = await supabase.storage.from("docs").createSignedUrl(path, expiresInSec);
  if (error) throw new Error(error.message);
  return data?.signedUrl as string;
}

export async function removeDoc(path: string) {
  const { error } = await supabase.storage.from("docs").remove([path]);
  if (error) throw new Error(error.message);
}
