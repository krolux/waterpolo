import React from "react";
import { Save } from "lucide-react";
import type { TournamentClub } from "../../lib/competitions";

type MatchFormData = {
  date: string;
  time: string;
  location: string;
  round: string;
  series_round: string;
  home: string;
  away: string;
  referee1: string;
  referee2: string;
  delegate: string;
};

type MatchFormProps = {
  matchFormData: MatchFormData;
  setMatchFormData: React.Dispatch<React.SetStateAction<MatchFormData>>;
  tournamentClubs: Map<string, TournamentClub[]>;
  selectedTournamentForMatch: string | null;
  refereeNames: string[];
  delegateNames: string[];
  onSubmit: () => void;
  onCancel: () => void;
};

export const MatchForm: React.FC<MatchFormProps> = ({
  matchFormData,
  setMatchFormData,
  tournamentClubs,
  selectedTournamentForMatch,
  refereeNames,
  delegateNames,
  onSubmit,
  onCancel,
}) => {
  return (
    <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
      <h3 className="font-semibold mb-3 text-gray-800">Dodaj nowy mecz</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <input
              type="date"
              value={matchFormData.date}
              onChange={e => setMatchFormData(p => ({ ...p, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Godzina</label>
            <input
              type="time"
              value={matchFormData.time}
              onChange={e => setMatchFormData(p => ({ ...p, time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Miejsce *</label>
          <input
            type="text"
            value={matchFormData.location}
            onChange={e => setMatchFormData(p => ({ ...p, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="np. Basen Otwarty Poznań"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nr meczu / Round</label>
            <input
              type="text"
              value={matchFormData.round}
              onChange={e => setMatchFormData(p => ({ ...p, round: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="np. 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Runda / Series Round</label>
            <input
              type="text"
              value={matchFormData.series_round}
              onChange={e => setMatchFormData(p => ({ ...p, series_round: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="np. 1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gospodarz *</label>
            <select
              value={matchFormData.home}
              onChange={e => setMatchFormData(p => ({ ...p, home: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Wybierz gospodarza</option>
              {(tournamentClubs.get(selectedTournamentForMatch || "") || []).map(c => (
                <option key={c.id} value={c.club_name}>
                  {c.club_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goście *</label>
            <select
              value={matchFormData.away}
              onChange={e => setMatchFormData(p => ({ ...p, away: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Wybierz gości</option>
              {(tournamentClubs.get(selectedTournamentForMatch || "") || []).map(c => (
                <option key={c.id} value={c.club_name}>
                  {c.club_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sędzia 1</label>
            <select
              value={matchFormData.referee1}
              onChange={e => setMatchFormData(p => ({ ...p, referee1: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Wybierz sędziego 1</option>
              {refereeNames.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sędzia 2</label>
            <select
              value={matchFormData.referee2}
              onChange={e => setMatchFormData(p => ({ ...p, referee2: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Wybierz sędziego 2</option>
              {refereeNames.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delegat</label>
            <select
              value={matchFormData.delegate}
              onChange={e => setMatchFormData(p => ({ ...p, delegate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Wybierz delegata</option>
              {delegateNames.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onSubmit} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            <Save className="w-4 h-4 inline mr-2" />
            Dodaj mecz
          </button>
          <button onClick={onCancel} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition">
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};