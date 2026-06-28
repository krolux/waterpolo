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
    <div className="border border-green-300 rounded-lg p-4 bg-green-50">
      <h3 className="font-semibold mb-3 text-gray-800">Dodaj nowy turniej</h3>
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Etap</label>
          <select
            value={selectedStageForTournament}
            onChange={e => setSelectedStageForTournament(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {stages.map(stage => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
          <input
            type="text"
            value={tournamentFormData.name}
            onChange={e => setTournamentFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="np. Turniej Poznań"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
          <select
            value={tournamentFormData.type}
            onChange={e => setTournamentFormData(p => ({ ...p, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="league">League</option>
            <option value="group">Group</option>
            <option value="knockout">Knockout</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data startu</label>
            <input
              type="date"
              value={tournamentFormData.startDate}
              onChange={e => setTournamentFormData(p => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data końca</label>
            <input
              type="date"
              value={tournamentFormData.endDate}
              onChange={e => setTournamentFormData(p => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            <Save className="w-4 h-4 inline mr-2" />
            Dodaj turniej
          </button>
          <button onClick={onCancel} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition">
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};