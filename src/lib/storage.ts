import { supabase } from "./supabase";

export type DocKind = "comms" | "roster" | "report" | "photos";

/**
 * Konwencja ścieżek w bucket 'docs':
 * docs/<kind>/<matchId>/<clubOrNeutral>/<filename>
 * - kind: comms|roster|report|photos
 * - clubOrNeutral: nazwa klubu dla comms/roster, 'neutral' dla report/photos
 */
function makePath(kind: DocKind, matchId: string, clubOrNeutral: string, fileName: string) {
  const safe = (s: string) => s.replaceAll("/", "-").replaceAll(" ", "_");
  return `${kind}/${matchId}/${safe(clubOrNeutral)}/${Date.now()}_${safe(fileName)}`;
}

export async function uploadDoc(kind: DocKind, matchId: string, clubOrNeutral: string, file: File) {
  const path = makePath(kind, matchId, clubOrNeutral, file.name);
  const { data, error } = await supabase.storage.from("docs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return data?.path as string; // zapisujemy tylko ścieżkę
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
