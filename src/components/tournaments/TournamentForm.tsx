import React from "react";
import { Save } from "lucide-react";
import type { Stage } from "../../lib/competitions";

type TournamentFormData = {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
};

type TournamentFormProps = {
  stages: Stage[];
  selectedStageForTournament: string;
  setSelectedStageForTournament: React.Dispatch<React.SetStateAction<string | null>>;
  tournamentFormData: TournamentFormData;
  setTournamentFormData: React.Dispatch<React.SetStateAction<TournamentFormData>>;
  onSubmit: () => void;
  onCancel: () => void;
};

export const TournamentForm: React.FC<TournamentFormProps> = ({
  stages,
  selectedStageForTournament,
  setSelectedStageForTournament,
  tournamentFormData,
  setTournamentFormData,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-[#061a33]">Dodaj nowy turniej</h3>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Etap</label>
          <select
            value={selectedStageForTournament}
            onChange={e => setSelectedStageForTournament(e.target.value)}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
          >
            {stages.map(stage => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nazwa</label>
          <input
            type="text"
            value={tournamentFormData.name}
            onChange={e => setTournamentFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            placeholder="np. Turniej Poznań"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Typ</label>
          <select
            value={tournamentFormData.type}
            onChange={e => setTournamentFormData(p => ({ ...p, type: e.target.value }))}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
          >
            <option value="league">League</option>
            <option value="group">Group</option>
            <option value="knockout">Knockout</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data startu</label>
            <input
              type="date"
              value={tournamentFormData.startDate}
              onChange={e => setTournamentFormData(p => ({ ...p, startDate: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data końca</label>
            <input
              type="date"
              value={tournamentFormData.endDate}
              onChange={e => setTournamentFormData(p => ({ ...p, endDate: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onSubmit} className="rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2 font-semibold text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]">
            <Save className="w-4 h-4 inline mr-2" />
            Dodaj turniej
          </button>
          <button onClick={onCancel} className="rounded-xl border border-[#dbeafe] bg-white px-4 py-2 text-[#08284a] transition hover:bg-sky-50">
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};