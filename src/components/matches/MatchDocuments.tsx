import React from "react";
import { FileText } from "lucide-react";
import { getMatchRosterPdfPayload, listMatchRosterDocuments, type MatchRosterDocument } from "../../lib/rosters";
import { generateMatchRosterPdf } from "../../lib/rosterPdf";
import { DocBadge } from "../shared/DocBadge";
import type { Match } from "../../types/wpolo";

export function MatchDocuments({ match }: { match: Match }) {
  const [rosters, setRosters] = React.useState<MatchRosterDocument[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    listMatchRosterDocuments(match.id)
      .then(rows => { if (active) setRosters(rows); })
      .catch(() => { if (active) setRosters([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [match.id]);

  const openRoster = async (document: MatchRosterDocument) => {
    const payload = await getMatchRosterPdfPayload(match.id, document.clubId);
    if (!payload) return alert("Nie udało się otworzyć składu.");
    await generateMatchRosterPdf(payload);
  };

  const legacyDocuments = [
    ...Object.entries(match.commsByClub || {}).map(([club, file]) => ({ club, file, kind: "Komunikat" })),
    ...Object.entries(match.rosterByClub || {}).map(([club, file]) => ({ club, file, kind: "Skład" })),
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
          <button key={document.rosterId} type="button" onClick={() => void openRoster(document)} className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
            <FileText className="h-3.5 w-3.5" /> Skład: {document.clubName}
          </button>
        ))}
      </div>
    </div>
  );
}
