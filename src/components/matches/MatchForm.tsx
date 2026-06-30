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
    <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-[#061a33]">Dodaj nowy mecz</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data *</label>
            <input
              type="date"
              value={matchFormData.date}
              onChange={e => setMatchFormData(p => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Godzina</label>
            <input
              type="time"
              value={matchFormData.time}
              onChange={e => setMatchFormData(p => ({ ...p, time: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Miejsce *</label>
          <input
            type="text"
            value={matchFormData.location}
            onChange={e => setMatchFormData(p => ({ ...p, location: e.target.value }))}
            className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
            placeholder="np. Basen Otwarty Poznań"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nr meczu / Round</label>
            <input
              type="text"
              value={matchFormData.round}
              onChange={e => setMatchFormData(p => ({ ...p, round: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
              placeholder="np. 1"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Runda / Series Round</label>
            <input
              type="text"
              value={matchFormData.series_round}
              onChange={e => setMatchFormData(p => ({ ...p, series_round: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
              placeholder="np. 1"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gospodarz *</label>
            <select
              value={matchFormData.home}
              onChange={e => setMatchFormData(p => ({ ...p, home: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Goście *</label>
            <select
              value={matchFormData.away}
              onChange={e => setMatchFormData(p => ({ ...p, away: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Sędzia 1</label>
            <select
              value={matchFormData.referee1}
              onChange={e => setMatchFormData(p => ({ ...p, referee1: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Sędzia 2</label>
            <select
              value={matchFormData.referee2}
              onChange={e => setMatchFormData(p => ({ ...p, referee2: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Delegat</label>
            <select
              value={matchFormData.delegate}
              onChange={e => setMatchFormData(p => ({ ...p, delegate: e.target.value }))}
              className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
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
          <button onClick={onSubmit} className="rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2 font-semibold text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]">
            <Save className="w-4 h-4 inline mr-2" />
            Dodaj mecz
          </button>
          <button onClick={onCancel} className="rounded-xl border border-[#dbeafe] bg-white px-4 py-2 text-[#08284a] transition hover:bg-sky-50">
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};