import React from "react";
import type { SortMode } from "../../hooks/useRosterPanel";

type RosterSearchProps = {
  query: string;
  sortMode: SortMode;
  onQueryChange: (value: string) => void;
  onSortModeChange: (value: SortMode) => void;
};

export const RosterSearch: React.FC<RosterSearchProps> = ({ query, sortMode, onQueryChange, onSortModeChange }) => {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Szukaj zawodnika..."
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <select
        value={sortMode}
        onChange={(e) => onSortModeChange(e.target.value as SortMode)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        <option value="number">Sortuj według: numeru</option>
        <option value="lastName">Sortuj według: nazwiska</option>
        <option value="birthYear">Sortuj według: rocznika</option>
        <option value="licenseStatus">Sortuj według: statusu licencji</option>
      </select>
    </div>
  );
};