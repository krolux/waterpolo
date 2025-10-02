// src/lib/storage.ts
import { supabase } from "./supabase";

export type DocKind = "comms" | "roster" | "report" | "photos";

/** delikatna normalizacja: bez ukośników, spacje → podkreślniki */
const safe = (s: string) => (s || "").replace(/\//g, "-").replace(/ /g, "_");

/** ZAWSZE unikalna ścieżka (timestamp + skrócony UUID) */
function makePath(kind: DocKind, matchId: string, clubOrNeutral: string, fileName: string) {
  const uniq = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  return `${safe(kind)}/${safe(matchId)}/${safe(clubOrNeutral)}/${uniq}_${safe(fileName)}`;
}

/**
 * Upload z „auto-retry”, gdy Storage zwróci „The resource already exists”.
 * Dodatkowo ustawiamy contentType i pozwalamy nadpisać jeśli serwer jednak uzna, że plik istnieje.
 */
export async function uploadDoc(kind: DocKind, matchId: string, clubOrNeutral: string, file: File) {
  // 1. pierwsza próba z nową, unikalną ścieżką
  let path = makePath(kind, matchId, clubOrNeutral, file.name);

  try {
    const { data, error } = await supabase.storage.from("docs2").upload(path, file, {
      cacheControl: "3600",
      upsert: true,               // ← pozwól nadpisać, jeśli storage jednak „widzi” kolizję
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw error;
    return (data?.path as string) || path;
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    // 2. jeśli mimo wszystko zgłosi kolizję – spróbuj jeszcze raz z całkiem inną nazwą
    if (/resource already exists/i.test(msg)) {
      path = makePath(kind, matchId, clubOrNeutral, file.name);
      const { data, error } = await supabase.storage.from("docs2").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      return (data?.path as string) || path;
    }
    throw e;
  }
}

export async function getSignedUrl(path: string, expiresInSec = 60 * 60) {
  const { data, error } = await supabase.storage.from("docs2").createSignedUrl(path, expiresInSec);
  if (error) throw new Error(error.message);
  return data?.signedUrl as string;
}

export async function removeDoc(path: string) {
  const { error } = await supabase.storage.from("docs2").remove([path]);
  if (error) throw new Error(error.message);
}
