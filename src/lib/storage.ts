// src/lib/storage.ts
import { supabase } from "./supabase";

export type DocKind = "comms" | "roster" | "report" | "photos";

// --- SANITIZACJA NAZW ---
// 1) usuwa diakrytyki (ę → e, ł → l itd.)
// 2) wszystko na małe litery
// 3) zostawia tylko [a-z0-9._-], resztę zamienia na podkreślniki
// 4) usuwa powtórzenia podkreślników i przycina z boków
function sanitizeSegment(s: string) {
  const noDiacritics = (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents

  const ascii = noDiacritics
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  // bezpieczeństwo: nie pozwól na pusty segment
  return ascii || "file";
}

// Jedyna i właściwa wersja makePath (unikalna + bezpieczna)
function makePath(kind: DocKind, matchId: string, clubOrNeutral: string, fileName: string) {
  // zachowaj rozszerzenie (jeśli jest)
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(fileName || "");
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";

  const baseName = (fileName || "").replace(/\.[^.]+$/, ""); // bez rozszerzenia
  const uuid = (globalThis as any)?.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  const uniq = `${Date.now()}_${uuid.slice(0, 8)}`;

  const kindSeg = sanitizeSegment(kind);
  const matchSeg = sanitizeSegment(matchId);
  const clubSeg = sanitizeSegment(clubOrNeutral);
  const fileSeg = sanitizeSegment(baseName);

  return `${kindSeg}/${matchSeg}/${clubSeg}/${fileSeg}_${uniq}${ext}`;
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
      upsert: true, // pozwól nadpisać, jeśli storage jednak „widzi” kolizję
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
