import React from "react";
import { X } from "lucide-react";
import type { DbMatchRow } from "../../lib/matches";
import type { Tournament } from "../../lib/competitions";

export type MatchDraftV2 = Pick<DbMatchRow, "date" | "time" | "round" | "series_round" | "location" | "home" | "away" | "result" | "referee1" | "referee2" | "delegate" | "notes" | "stream_url"> & {
  tournamentId: string;
};

export const blankMatchV2 = (): MatchDraftV2 => ({
  date: new Date().toISOString().slice(0, 10), time: "", round: "", series_round: "", location: "",
  home: "", away: "", result: "", referee1: "", referee2: "", delegate: "", notes: "", stream_url: "", tournamentId: "",
});

type Props = {
  draft: MatchDraftV2;
  setDraft: React.Dispatch<React.SetStateAction<MatchDraftV2>>;
  tournaments: Tournament[];
  clubs: string[];
  refereeNames: string[];
  delegateNames: string[];
  editing: boolean;
  onSave: () => void;
  onHide: () => void;
  onCancel: () => void;
};

const input = "w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm";

export function MatchFormV2({ draft, setDraft, tournaments, clubs, refereeNames, delegateNames, editing, onSave, onHide, onCancel }: Props) {
  const set = (key: keyof MatchDraftV2, value: string) => setDraft(old => ({ ...old, [key]: value }));
  return <div className="rounded-2xl border border-sky-200 bg-[#f8fcff] p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-[#061a33]">{editing ? "Edytuj mecz" : "Dodaj mecz"}</h3><button aria-label="Schowaj formularz" onClick={onHide}><X className="h-5 w-5" /></button></div>
    <div className="grid gap-2 md:grid-cols-2">
      <input className={input} type="date" value={draft.date} onChange={e => set("date", e.target.value)} />
      <input className={input} type="time" value={draft.time || ""} onChange={e => set("time", e.target.value)} />
      <input className={input} placeholder="Miejsce *" value={draft.location} onChange={e => set("location", e.target.value)} />
      <select className={input} value={draft.tournamentId} onChange={e => set("tournamentId", e.target.value)} disabled={editing}>
        <option value="">Mecz bez turnieju</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <select className={input} value={draft.home} onChange={e => set("home", e.target.value)}><option value="">Gospodarz *</option>{clubs.map(c => <option key={c}>{c}</option>)}</select>
      <select className={input} value={draft.away} onChange={e => set("away", e.target.value)}><option value="">Goście *</option>{clubs.map(c => <option key={c}>{c}</option>)}</select>
      <input className={input} placeholder="Nr meczu" value={draft.round || ""} onChange={e => set("round", e.target.value)} />
      <input className={input} placeholder="Runda" value={draft.series_round || ""} onChange={e => set("series_round", e.target.value)} />
      <input className={input} placeholder="Wynik, np. 10:8" value={draft.result || ""} onChange={e => set("result", e.target.value)} />
      <input className={input} placeholder="Link do transmisji" value={draft.stream_url || ""} onChange={e => set("stream_url", e.target.value)} />
      <select className={input} value={draft.referee1 || ""} onChange={e => set("referee1", e.target.value)}><option value="">Sędzia 1</option>{refereeNames.map(n => <option key={n}>{n}</option>)}</select>
      <select className={input} value={draft.referee2 || ""} onChange={e => set("referee2", e.target.value)}><option value="">Sędzia 2</option>{refereeNames.map(n => <option key={n}>{n}</option>)}</select>
      <select className={input} value={draft.delegate || ""} onChange={e => set("delegate", e.target.value)}><option value="">Delegat</option>{delegateNames.map(n => <option key={n}>{n}</option>)}</select>
      <input className={input} placeholder="Uwagi" value={draft.notes || ""} onChange={e => set("notes", e.target.value)} />
    </div>
    <div className="mt-3 flex gap-2"><button className="rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2 font-semibold text-white" onClick={onSave}>Zapisz</button><button className="rounded-xl border border-sky-200 bg-white px-4 py-2" onClick={onCancel}>Anuluj</button></div>
  </div>;
}
