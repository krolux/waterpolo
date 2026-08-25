import React from "react";
import { Download, FileText, X } from "lucide-react";
import { getLatestMatchRosterSubmission, getMatchRoster, getMatchRosterPdfPayload, listMatchRosterDocuments, verifyPlayerLicense, type MatchRosterDocument, type MatchRosterSubmissionRow, type MatchRosterWithPlayers } from "../../lib/rosters";
import { generateMatchRosterPdf } from "../../lib/rosterPdf";
import { DocBadge, type StoredFile } from "../shared/DocBadge";
import type { Match, Role } from "../../types/wpolo";
import { LicenseStatus } from "../club/LicenseStatus";

type EffectiveUser = { name: string; role: Role; club?: string } | null;

export function MatchDocuments({ match, effectiveUser }: { match: Match; effectiveUser: EffectiveUser }) {
  const [rosters, setRosters] = React.useState<MatchRosterDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [previewDocument, setPreviewDocument] = React.useState<MatchRosterDocument | null>(null);
  const [previewRoster, setPreviewRoster] = React.useState<MatchRosterWithPlayers | null>(null);
  const [previewSubmission, setPreviewSubmission] = React.useState<MatchRosterSubmissionRow | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [verifyingIds, setVerifyingIds] = React.useState<Set<string>>(new Set());
  const roleTokens = String(effectiveUser?.role || "").split(/[-+,\s]+/);
  const canVerify = roleTokens.includes("Referee") || roleTokens.includes("Admin");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    listMatchRosterDocuments(match.id)
      .then(rows => { if (active) setRosters(rows); })
      .catch(() => { if (active) setRosters([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [match.id]);

  const loadPreview = React.useCallback(async (document: MatchRosterDocument) => {
    setPreviewDocument(document);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const roster = await getMatchRoster(match.id, document.clubId);
      setPreviewRoster(roster);
      setPreviewSubmission(roster ? await getLatestMatchRosterSubmission(roster.id) : null);
    } catch {
      setPreviewRoster(null);
      setPreviewSubmission(null);
      setPreviewError("Nie udało się pobrać podglądu składu.");
    } finally {
      setPreviewLoading(false);
    }
  }, [match.id]);

  const downloadRoster = async () => {
    if (!previewDocument) return;
    const payload = await getMatchRosterPdfPayload(match.id, previewDocument.clubId);
    if (!payload) return alert("Nie udało się przygotować PDF.");
    await generateMatchRosterPdf(payload);
  };

  const approvePlayer = async (playerId: string) => {
    if (!effectiveUser || !previewDocument) return;
    setVerifyingIds(current => new Set(current).add(playerId));
    try {
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 3);
      await verifyPlayerLicense({ playerId, checkedByName: effectiveUser.name, checkedByRole: effectiveUser.role, validUntil: validUntil.toISOString().slice(0, 10), verificationType: "match", matchId: match.id });
      await loadPreview(previewDocument);
    } catch {
      alert("Nie udało się zatwierdzić zawodnika.");
    } finally {
      setVerifyingIds(current => { const next = new Set(current); next.delete(playerId); return next; });
    }
  };

  const isStoredFile = (file: unknown): file is StoredFile => !!file && typeof file === "object" && typeof (file as StoredFile).id === "string" && typeof (file as StoredFile).path === "string";
  const legacyDocuments: Array<{ club: string; file: StoredFile; kind: string }> = [
    ...Object.entries(match.commsByClub || {}).flatMap(([club, file]) => isStoredFile(file) ? [{ club, file, kind: "Komunikat" }] : []),
    ...Object.entries(match.rosterByClub || {}).flatMap(([club, file]) => isStoredFile(file) ? [{ club, file, kind: "Skład" }] : []),
    ...(match.matchReport ? [{ club: "Mecz", file: match.matchReport, kind: "Protokół" }] : []),
  ];

  if (!loading && !rosters.length && !legacyDocuments.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600"><FileText className="h-4 w-4" /> Dokumenty meczu</div>
      <div className="flex flex-wrap gap-2">
        {loading ? <span className="text-xs text-slate-500">Sprawdzanie dokumentów…</span> : null}
        {legacyDocuments.map(({ club, file, kind }) => <DocBadge key={`${kind}-${club}-${file.id}`} file={file} label={`${kind}: ${club}`} />)}
        {rosters.map(document => (
          <button key={document.rosterId} type="button" onClick={() => void loadPreview(document)} className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
            <FileText className="h-3.5 w-3.5" /> Skład: {document.clubName}
          </button>
        ))}
      </div>
      {previewDocument ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewDocument(null); }}>
          <div role="dialog" aria-modal="true" aria-label={`Skład ${previewDocument.clubName}`} className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div><h3 className="text-lg font-semibold text-[#061a33]">Skład: {previewDocument.clubName}</h3><p className="text-sm text-slate-600">{match.home} – {match.away} • {new Date(match.date).toLocaleDateString("pl-PL")}{match.time ? `, ${match.time}` : ""}</p></div>
              <button type="button" onClick={() => setPreviewDocument(null)} aria-label="Zamknij podgląd" className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[calc(92vh-130px)] overflow-auto p-4">
              {previewLoading ? <p className="text-sm text-slate-500">Ładowanie składu…</p> : null}
              {previewError ? <p className="text-sm text-red-600">{previewError}</p> : null}
              {!previewLoading && !previewError && previewRoster ? (
                <>
                  <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                    {previewSubmission?.submitted_at ? <span>Wysłano: {new Date(previewSubmission.submitted_at).toLocaleString("pl-PL")}</span> : null}
                    {previewSubmission?.submitted_by_name ? <span>Autor: {previewSubmission.submitted_by_name}</span> : null}
                    {typeof previewSubmission?.version === "number" ? <span>Wersja: {previewSubmission.version}</span> : null}
                    {previewSubmission?.verification_code ? <span>Kod: {previewSubmission.verification_code}</span> : null}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Nr</th><th className="p-2">Zawodnik</th><th className="p-2">Rocznik</th><th className="p-2">Licencja</th><th className="p-2">Funkcja</th><th className="p-2">Status</th>{canVerify ? <th className="p-2 text-right">Akcja sędziego</th> : null}</tr></thead>
                      <tbody>{previewRoster.players.map(entry => <tr key={entry.id} className="border-t border-slate-100"><td className="p-2 font-semibold">{entry.slot}</td><td className="p-2 font-medium">{entry.player.first_name} {entry.player.last_name}</td><td className="p-2">{entry.player.birth_year}</td><td className="p-2">{entry.player.license_number || "—"}</td><td className="p-2">{[entry.is_goalkeeper ? "Bramkarz" : "", entry.is_captain ? "Kapitan" : ""].filter(Boolean).join(", ") || "—"}</td><td className="p-2"><LicenseStatus licenseStatus={entry.player.license_status} licenseValidUntil={entry.player.license_verified_until || undefined} targetDate={match.date} verifiedAt={entry.player.license_verified_at || undefined} verifiedBy={entry.player.license_verified_by || undefined} /></td>{canVerify ? <td className="p-2 text-right"><button type="button" disabled={verifyingIds.has(entry.player.id)} onClick={() => void approvePlayer(entry.player.id)} className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50">{verifyingIds.has(entry.player.id) ? "Zatwierdzanie…" : "Zatwierdź na 3 miesiące"}</button></td> : null}</tr>)}</tbody>
                    </table>
                  </div>
                </>
              ) : null}
              {!previewLoading && !previewError && !previewRoster ? <p className="text-sm text-slate-500">Brak zapisanego składu.</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3"><button type="button" onClick={() => setPreviewDocument(null)} className="rounded-lg border px-3 py-2 text-sm">Zamknij</button><button type="button" onClick={() => void downloadRoster()} disabled={!previewRoster} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"><Download className="h-4 w-4" /> Pobierz PDF</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
