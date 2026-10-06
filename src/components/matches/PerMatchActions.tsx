import { HostMatchDetails } from './HostMatchDetails';
import { canEditMatchResult } from '../../lib/matchResultAccess';
import { isClubSide } from '../../lib/clubIdentity';
import React, { useEffect, useMemo, useState } from "react";
import { Check, Image, UploadCloud } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { addPenalty } from "../../lib/penalties";
import { setMatchResult } from "../../lib/matches";
import { uploadDoc } from "../../lib/storage";
import type { AppState, Match, Role, StoredFile, UploadLog } from "../../types/wpolo";

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const normKey = (s?: string) =>
  (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const classes = {
  input: "w-full px-3 py-2 rounded-xl border border-[#dbeafe] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white font-semibold hover:from-[#0f99ff] hover:to-[#4acbff] shadow-[0_10px_20px_rgba(5,140,255,0.24)]",
  btnOutline: "px-3 py-2 rounded-xl border border-[#cde6ff] text-[#0A1F44] bg-white hover:bg-sky-50",
};

async function toStoredFileUsingStorage(
  kind: "comms" | "roster" | "report" | "photos",
  matchId: string,
  clubOrNeutral: string,
  file: File,
  uploadedBy: string,
  label: string
): Promise<StoredFile> {
  const path = await uploadDoc(kind, matchId, clubOrNeutral, file);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    path,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    label,
  };
}

function sanitizeUrl(u?: string | null) {
  const s = (u || "").trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return null;
  } catch {
    if (/^([a-z0-9-]+\.)+[a-z]{2,}/i.test(s)) return `https://${s}`;
    return null;
  }
}

type BaseRole = "Guest" | "Admin" | "Club" | "Delegate" | "Referee" | "Editor";

function roleTokens(role?: string): BaseRole[] {
  const r = (role || "Guest").toString().trim();
  if (r === "Admin") return ["Admin", "Club", "Delegate", "Referee"];
  return r.split(/[-+,\s]+/).map(s => s.trim()).filter(Boolean) as BaseRole[];
}

function hasRole(user: { role?: string | Role } | null | undefined, target: BaseRole) {
  if (!user?.role) return target === "Guest";
  const toks = roleTokens(String(user.role));
  return toks.includes(target);
}

function isAdmin(u: { role: Role }) {
  return hasRole(u, "Admin");
}

function isClub(u: { role: Role }) {
  return hasRole(u, "Club") || isAdmin(u);
}

function canUploadComms(user: { role: Role; club?: string; clubId?: string }, m: Match) {
  return isAdmin(user) || isClub(user) && !!user.clubId && isClubSide(user, m, "home");
}

function canUploadRoster(user: { role: Role; club?: string; clubId?: string }, m: Match) {
  return isAdmin(user) || isClub(user) && !!user.clubId && (isClubSide(user, m, "home") || isClubSide(user, m, "away"));
}

function canUploadReport(user: { role: Role; name?: string }, m: Match) {
  return isAdmin(user) || (!!m.delegate && !!user?.name && m.delegate === user.name);
}


type PerMatchActionsProps = {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  user: { name: string; role: Role; club?: string; clubId?: string };
  onPenaltiesChange: () => void;
  fixedMatch?: Match;
  onResultSaved?: () => Promise<void> | void;
};

export const PerMatchActions: React.FC<PerMatchActionsProps> = ({
  state,
  setState,
  user,
  onPenaltiesChange,
  fixedMatch,
  onResultSaved,
}) => {
  const availableMatches = useMemo(() => {
    if (fixedMatch) return [fixedMatch];
    if (user.role === "Delegate") {
      return state.matches.filter(m => m.delegate === user.name);
    }
    if (user.role === "Club" && user.club) {
      return state.matches.filter(m => isClubSide(user, m, "home") || isClubSide(user, m, "away"));
    }
    return state.matches;
  }, [fixedMatch, state.matches, user.role, user.name, user.club, user.clubId]);

  const [selectedId, setSelectedId] = useState<string>(fixedMatch?.id ?? availableMatches[0]?.id ?? "");
  useEffect(() => {
    if (fixedMatch) {
      setSelectedId(fixedMatch.id);
      return;
    }
    setSelectedId(availableMatches[0]?.id ?? "");
  }, [availableMatches, fixedMatch]);

  const match = fixedMatch ?? (availableMatches.find(m => m.id === selectedId) || null);
  const isMatchDelegate = !!match && match.delegate === user.name;
  const canActAsDelegate = isAdmin(user) || isMatchDelegate;
  const [savingResult, setSavingResult] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultError, setResultError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [adminRosterSide, setAdminRosterSide] = useState<"home" | "away">("home");
  const [resultDraft, setResultDraft] = useState<string>(match?.result || "");
  const [shootoutDraft, setShootoutDraft] = useState<boolean>(!!match?.shootout);

  useEffect(() => {
    setResultMessage("");
    setResultError("");
    setResultDraft(match?.result || "");
    setShootoutDraft(!!match?.shootout);
  }, [match?.id]);

  function pushLog(next: Match, entry: Omit<UploadLog, "id" | "matchId" | "at">) {
    next.uploadsLog = [
      { id: crypto.randomUUID(), matchId: next.id, at: new Date().toISOString(), ...entry },
      ...next.uploadsLog,
    ];
  }

  async function handleUpload(type: "comms" | "roster" | "report" | "photos") {
    if (!match) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "photos" ? "image/jpeg,image/png,image/webp" : ".pdf,application/pdf";
    if (type === "photos") input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      const next = { ...match } as Match;

      if (type === "comms" || type === "roster") {
        if (!isAdmin(user) && (!isClub(user) || !user.clubId)) {
          alert("Ta akcja jest dostępna tylko dla roli Klub (z ustawioną nazwą klubu).");
          return;
        }

        const key = isAdmin(user) ? (type === "roster" ? adminRosterSide : "home") : isClubSide(user, match, "home") ? "home" : isClubSide(user, match, "away") ? "away" : null;

        if (!key) {
          alert("Twój klub nie jest przypisany do tego meczu.");
          return;
        }

        try {
          if (type === "comms") {
            if (!canUploadComms(user, match)) {
              alert("Komunikat może dodać wyłącznie gospodarz meczu.");
              return;
            }

            const clubKey = match.homeClubId;
            if (!clubKey) throw new Error("Nie można ustalić ID klubu gospodarza.");
            const sf = await toStoredFileUsingStorage(
              "comms",
              match.id,
              clubKey,
              files[0],
              user.name,
              `Komunikat - ${match.home} - ${match.date}`
            );

            next.commsByClub[key] = sf;
            pushLog(next, { type: "comms", club: user.club, user: user.name, fileName: sf.name });
          } else {
            if (!canUploadRoster(user, match)) {
              alert("Skład może dodać tylko klub biorący udział w meczu.");
              return;
            }

            const clubName = key === "home" ? match.home : match.away;
            const clubKey = key === "home" ? match.homeClubId : match.awayClubId;
            if (!clubKey) throw new Error("Nie można ustalić ID klubu.");
            const sf = await toStoredFileUsingStorage(
              "roster",
              match.id,
              clubKey,
              files[0],
              user.name,
              `Skład - ${clubName} - ${match.date}`
            );

            next.rosterByClub[key] = sf;
            pushLog(next, { type: "roster", club: user.club, user: user.name, fileName: sf.name });
          }
        } catch (e: any) {
          console.error("[UPLOAD ERROR]", e);
          alert("Błąd wysyłania pliku: " + (e?.message || e));
          return;
        }
      }

      if (type === "report") {
        try {
          if (!canUploadReport(user, match)) {
            alert("Protokół może dodać tylko delegat tego meczu lub Admin.");
            return;
          }

          const sf = await toStoredFileUsingStorage(
            "report",
            match.id,
            "neutral",
            files[0],
            user.name,
            `Protokół - ${match.home} vs ${match.away} - ${match.date}`
          );

          next.matchReport = sf;
          pushLog(next, { type: "protocol", club: null, user: user.name, fileName: sf.name });
        } catch (e: any) {
          console.error("[UPLOAD ERROR]", e);
          alert("Błąd wysyłania protokołu: " + (e?.message || e));
          return;
        }
      }

      if (type === "photos") {
        try {
          if (!canUploadReport(user, match)) {
            alert("Zdjęcia raportu może dodać tylko delegat tego meczu lub Admin.");
            return;
          }

          const sfs: StoredFile[] = [];
          for (const f of files) {
            sfs.push(await toStoredFileUsingStorage("photos", match.id, "neutral", f, user.name, "Zdjęcie raportu"));
          }

          next.reportPhotos = [...next.reportPhotos, ...sfs];
          pushLog(next, { type: "photos", club: null, user: user.name, fileName: `${files.length} zdjęć` });
        } catch (e: any) {
          console.error("[UPLOAD ERROR]", e);
          alert("Błąd wysyłania zdjęć: " + (e?.message || e));
          return;
        }
      }

      setState(prev => ({
        ...prev,
        matches: prev.matches.map(m => (m.id === match.id ? next : m)),
      }));
      setUploadMessage(type === "roster" ? "Dodano skład PDF." : "Dodano dokument meczu.");
      onPenaltiesChange();
    };

    input.click();
  }

  async function saveResult() {
    if (!match || savingResult) return;
    if (!canEditMatchResult(user, match)) {
      alert("Wynik może zapisać administrator, delegat lub sędzia przypisany do tego meczu.");
      return;
    }
    setSavingResult(true);
    setResultMessage("");
    setResultError("");
    try {
      const saved = await setMatchResult(match.id, resultDraft, shootoutDraft);
      setState(prev => ({
        ...prev,
        matches: prev.matches.map(m =>
          m.id === match.id ? { ...m, result: saved.result, shootout: saved.shootout } : m
        ),
      }));
      setResultDraft(saved.result);
      setResultMessage("Zapisano wynik " + saved.result + ".");
      if (onResultSaved) {
        try { await onResultSaved(); } catch { setResultMessage("Wynik zapisano. Odśwież stronę, aby odświeżyć tabelę."); }
      }
    } catch (e: any) {
      setResultError("Błąd zapisu wyniku: " + (e?.message || String(e)));
    } finally {
      setSavingResult(false);
    }
  }

  const canClubAct = () => isAdmin(user) || isClub(user) && !!user.clubId;

  return (
    <div className="grid gap-4">
      {!fixedMatch && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-amber-600">Wybierz mecz:</span>
          <select className={classes.input} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {availableMatches.length === 0 ? (
              <option value="" disabled>
                Brak meczów do wyboru
              </option>
            ) : (
              availableMatches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.date} {m.time ? m.time + " • " : ""}
                  {m.home} vs {m.away}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {match && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {uploadMessage && <p role="status" className="text-green-700">{uploadMessage}</p>}
          {isAdmin(user) && (
              <label>Skład PDF dla: <select className={classes.input} value={adminRosterSide} onChange={e => setAdminRosterSide(e.target.value as "home" | "away")}><option value="home">{match.home} (gospodarz)</option><option value="away">{match.away} (goście)</option></select></label>
            )}
            {canClubAct() && (
              <>
                {canUploadComms(user, match) && (
                  <button onClick={() => handleUpload("comms")} className={clsx(classes.btnOutline, "flex items-center gap-2")}>
                    <UploadCloud className="w-4 h-4" />Dodaj komunikat (Gospodarz)
                  </button>
                )}
                {canUploadRoster(user, match) ? (
                  <button onClick={() => handleUpload("roster")} className={clsx(classes.btnOutline, "flex items-center gap-2")}>
                    <UploadCloud className="w-4 h-4" />Dodaj skład PDF (Twój klub)
                  </button>
                ) : (
                  <div className="text-sm text-gray-600">Twój klub nie jest uczestnikiem tego meczu.</div>
                )}
              </>
            )}

            {(isAdmin(user) || isClubSide(user, match, "home")) && (
              <HostMatchDetails match={match} setState={setState} onSaved={onResultSaved} />
            )}

            {canActAsDelegate && (
              <>
                <button
                  onClick={() => handleUpload("report")}
                  className={clsx(classes.btnPrimary, "flex items-center gap-2 w-full sm:w-auto")}
                >
                  <UploadCloud className="w-4 h-4" />Dodaj protokół
                </button>
                <button
                  onClick={() => handleUpload("photos")}
                  className={clsx(classes.btnOutline, "flex items-center gap-2 w-full sm:w-auto")}
                >
                  <Image className="w-4 h-4" />Dodaj zdjęcia raportu
                </button>
              </>
            )}
          </div>

          {isAdmin(user) && (
            <div className="mt-4 border-t pt-3">
              <div className="text-sm text-amber-600 font-medium mb-2">Nałóż karę</div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <select id="pen-club" className={classes.input + " w-full"} defaultValue="">
                  <option value="" disabled>
                    Wybierz klub
                  </option>
                  <option value={match.home}>{match.home} (gospodarz)</option>
                  <option value={match.away}>{match.away} (goście)</option>
                </select>
                <input id="pen-player" className={classes.input + " w-full"} placeholder="Nazwisko zawodnika" />
                <input id="pen-games" className={classes.input + " w-full"} type="number" min={1} placeholder="Mecze kary" />
              </div>

              <div className="mt-2">
                <button
                  className={clsx(classes.btnPrimary, "flex items-center gap-2")}
                  onClick={async () => {
                    const clubSel = document.getElementById("pen-club") as HTMLSelectElement;
                    const playerInp = document.getElementById("pen-player") as HTMLInputElement;
                    const gamesInp = document.getElementById("pen-games") as HTMLInputElement;

                    const club = clubSel?.value || "";
                    const player = playerInp?.value?.trim() || "";
                    const games = parseInt(gamesInp?.value || "0", 10);

                    if (!club || !player || !games || games < 1) {
                      alert("Wypełnij wszystkie pola: Klub, Nazwisko, Liczba meczów (>=1).");
                      return;
                    }

                    try {
                      await addPenalty(match.id, club, player, games, match.competitionSeasonId || null);
                      onPenaltiesChange();
                      alert("Kara dodana.");
                      clubSel.value = "";
                      playerInp.value = "";
                      gamesInp.value = "";
                    } catch (e: any) {
                      alert("Błąd dodawania kary: " + e.message);
                    }
                  }}
                >
                  Dodaj karę
                </button>
                <div className="text-xs text-gray-500 mt-1">
                  Kara będzie widoczna w kolejnych meczach tej samej kategorii, poczynając od następnego spotkania po meczu, w którym ją nałożono.
                </div>
              </div>
            </div>
          )}

          {canEditMatchResult(user, match) && (
            <div className="grid gap-2 grid-cols-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <input
                className={classes.input + " w-full sm:w-auto"}
                placeholder="Wynik (np. 10:9)"
                value={resultDraft}
                onChange={e => setResultDraft(e.target.value)}
                style={{ maxWidth: 200 }}
              />

              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={shootoutDraft} onChange={e => setShootoutDraft(e.target.checked)} />
                Rzuty karne
              </label>

              <button
                onClick={saveResult}
                disabled={savingResult}
                className={clsx(classes.btnPrimary, "flex items-center gap-2 w-full sm:w-auto")}
              >
                <Check className="w-4 h-4" />
                {savingResult ? "Zapisywanie…" : "Zapisz wynik"}
              </button>

              <span className="text-xs text-gray-500 block">Administrator, delegat lub sędzia tego meczu</span>
              {resultMessage && <p role="status" className="text-sm text-green-700">{resultMessage}</p>}
              {resultError && <p role="alert" className="text-sm text-red-700">{resultError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
