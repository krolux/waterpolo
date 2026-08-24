import React from "react";
import { X } from "lucide-react";
import type { Stage } from "../../lib/competitions";

export type StageDraftV2 = { name: string; type: string; startDate: string; endDate: string };
export type TournamentDraftV2 = { stageId: string; name: string; type: string; startDate: string; endDate: string; clubs: string[] };
const input = "w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-sm";

export function StageFormV2({ value, setValue, onSave, onHide, onCancel }: { value: StageDraftV2; setValue: React.Dispatch<React.SetStateAction<StageDraftV2>>; onSave: () => void; onHide: () => void; onCancel: () => void }) {
  return <div className="rounded-2xl border border-sky-200 bg-[#f8fcff] p-4"><div className="mb-3 flex justify-between"><h3 className="font-semibold">Dodaj etap</h3><button onClick={onHide}><X className="h-5 w-5" /></button></div><div className="grid gap-2 md:grid-cols-2">
    <input className={input} placeholder="Nazwa etapu *" value={value.name} onChange={e => setValue(v => ({ ...v, name: e.target.value }))} />
    <select className={input} value={value.type} onChange={e => setValue(v => ({ ...v, type: e.target.value }))}><option value="round_robin">Round robin</option><option value="group">Faza grupowa</option><option value="knockout">Pucharowa</option><option value="finals">Finały</option></select>
    <input className={input} type="date" value={value.startDate} onChange={e => setValue(v => ({ ...v, startDate: e.target.value }))} /><input className={input} type="date" value={value.endDate} onChange={e => setValue(v => ({ ...v, endDate: e.target.value }))} />
  </div><div className="mt-3 flex gap-2"><button className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white" onClick={onSave}>Zapisz</button><button className="rounded-xl border bg-white px-4 py-2" onClick={onCancel}>Anuluj</button></div></div>;
}

export function TournamentFormV2({ value, setValue, stages, allClubs, onSave, onHide, onCancel }: { value: TournamentDraftV2; setValue: React.Dispatch<React.SetStateAction<TournamentDraftV2>>; stages: Stage[]; allClubs: string[]; onSave: () => void; onHide: () => void; onCancel: () => void }) {
  const toggle = (club: string) => setValue(v => ({ ...v, clubs: v.clubs.includes(club) ? v.clubs.filter(c => c !== club) : [...v.clubs, club] }));
  return <div className="rounded-2xl border border-sky-200 bg-[#f8fcff] p-4"><div className="mb-3 flex justify-between"><h3 className="font-semibold">Dodaj turniej</h3><button onClick={onHide}><X className="h-5 w-5" /></button></div><div className="grid gap-2 md:grid-cols-2">
    <select className={input} value={value.stageId} onChange={e => setValue(v => ({ ...v, stageId: e.target.value }))}><option value="">Wybierz etap *</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <input className={input} placeholder="Nazwa turnieju *" value={value.name} onChange={e => setValue(v => ({ ...v, name: e.target.value }))} />
    <select className={input} value={value.type} onChange={e => setValue(v => ({ ...v, type: e.target.value }))}><option value="league">Liga</option><option value="round_robin">Round robin</option><option value="group">Grupy</option><option value="knockout">Pucharowy</option><option value="final">Finał</option></select>
    <div className="grid grid-cols-2 gap-2"><input className={input} type="date" value={value.startDate} onChange={e => setValue(v => ({ ...v, startDate: e.target.value }))} /><input className={input} type="date" value={value.endDate} onChange={e => setValue(v => ({ ...v, endDate: e.target.value }))} /></div>
  </div><div className="mt-3"><div className="mb-2 text-sm font-medium">Kluby w turnieju</div><div className="grid max-h-44 gap-1 overflow-auto sm:grid-cols-2 lg:grid-cols-3">{allClubs.map(c => <label key={c} className="flex gap-2 rounded-lg bg-white px-2 py-1 text-sm"><input type="checkbox" checked={value.clubs.includes(c)} onChange={() => toggle(c)} />{c}</label>)}</div></div><div className="mt-3 flex gap-2"><button className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white" onClick={onSave}>Zapisz</button><button className="rounded-xl border bg-white px-4 py-2" onClick={onCancel}>Anuluj</button></div></div>;
}
