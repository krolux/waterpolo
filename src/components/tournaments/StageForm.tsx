import React from "react";
import { Save } from "lucide-react";

type StageFormData = {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
};

type StageFormProps = {
  stageFormData: StageFormData;
  setStageFormData: React.Dispatch<React.SetStateAction<StageFormData>>;
  onSubmit: () => void;
  onCancel: () => void;
};

export const StageForm: React.FC<StageFormProps> = ({ stageFormData, setStageFormData, onSubmit, onCancel }) => {
  return (
    <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-[#061a33]">Dodaj nowy etap</h3>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nazwa</label>
          <input
            type="text"
            value={stageFormData.name}
            onChange={e => setStageFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            placeholder="np. Eliminacje Zachód"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Typ</label>
          <select
            value={stageFormData.type}
            onChange={e => setStageFormData(p => ({ ...p, type: e.target.value }))}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
          >
            <option value="round_robin">Round Robin</option>
            <option value="group">Group Stage</option>
            <option value="knockout">Knockout</option>
            <option value="finals">Finals</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data startu</label>
            <input
              type="date"
              value={stageFormData.startDate}
              onChange={e => setStageFormData(p => ({ ...p, startDate: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data końca</label>
            <input
              type="date"
              value={stageFormData.endDate}
              onChange={e => setStageFormData(p => ({ ...p, endDate: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onSubmit}
            className="rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2 font-semibold text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Dodaj etap
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-[#dbeafe] bg-white px-4 py-2 text-[#08284a] transition hover:bg-sky-50"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};