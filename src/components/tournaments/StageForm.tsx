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
    <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
      <h3 className="font-semibold mb-3 text-gray-800">Dodaj nowy etap</h3>
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
          <input
            type="text"
            value={stageFormData.name}
            onChange={e => setStageFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="np. Eliminacje Zachód"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
          <select
            value={stageFormData.type}
            onChange={e => setStageFormData(p => ({ ...p, type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="round_robin">Round Robin</option>
            <option value="group">Group Stage</option>
            <option value="knockout">Knockout</option>
            <option value="finals">Finals</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data startu</label>
            <input
              type="date"
              value={stageFormData.startDate}
              onChange={e => setStageFormData(p => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data końca</label>
            <input
              type="date"
              value={stageFormData.endDate}
              onChange={e => setStageFormData(p => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Dodaj etap
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};