import React from "react";
import { LicenseStatus } from "./LicenseStatus";
import { RosterCounters } from "./RosterCounters";
import { RosterPlayerRow } from "./RosterPlayerRow";
import { RosterToolbar } from "./RosterToolbar";
import type { RosterPanelPlayer } from "../../hooks/useRosterPanel";

type TournamentRosterPanelProps = {
  players: RosterPanelPlayer[];
  count: number;
  limitReached: boolean;
  matchLimitReached: boolean;
  onAddPlayers: () => void;
  onCopy: () => void;
  onClear: () => void;
  onAddToMatch: (playerId: string) => void;
  onUpdateTournamentCapNumber: (playerId: string, value: string) => void;
  onToggleGoalkeeper: (playerId: string, checked: boolean) => void;
  onToggleCaptain: (playerId: string, checked: boolean) => void;
};

export const TournamentRosterPanel: React.FC<TournamentRosterPanelProps> = ({
  players,
  count,
  limitReached,
  matchLimitReached,
  onAddPlayers,
  onCopy,
  onClear,
  onAddToMatch,
  onUpdateTournamentCapNumber,
  onToggleGoalkeeper,
  onToggleCaptain,
}) => {
  return (
    <div className="space-y-2">
      <RosterCounters title="Lista turniejowa" count={count} limit={17} limitReached={limitReached} badgeText="Mock" />
      <RosterToolbar
        actions={[
          { label: "Dodaj zawodników", onClick: onAddPlayers, disabled: limitReached },
          { label: "Kopiuj", onClick: onCopy },
          { label: "Wyczyść listę turniejową", onClick: onClear },
        ]}
      />
      {players.length === 0 ? (
        <div className="text-sm text-gray-500">Brak zgłoszonego składu.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/70">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Imię</th>
                <th className="px-3 py-2">Nazwisko</th>
                <th className="px-3 py-2">GK</th>
                <th className="px-3 py-2">C</th>
                <th className="px-3 py-2">Domyślny nr</th>
                <th className="px-3 py-2">Turniejowy nr</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <RosterPlayerRow key={player.playerId}>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onAddToMatch(player.playerId)}
                      disabled={matchLimitReached}
                      className={matchLimitReached ? "rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 text-gray-400 cursor-not-allowed" : "rounded-lg border bg-white px-2 py-1 hover:bg-gray-50"}
                    >
                      →
                    </button>
                  </td>
                  <td className="px-3 py-2">{player.firstName}</td>
                  <td className="px-3 py-2">
                    <div>{player.lastName}</div>
                    {(player.loanClub || player.loanFromClub) ? <div className="text-xs text-gray-500">Wypozyczony z: {player.loanClub || player.loanFromClub}</div> : null}
                  </td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!player.isGoalkeeper} onChange={(e) => onToggleGoalkeeper(player.playerId, e.target.checked)} className="h-4 w-4 rounded border-slate-300" /></td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!player.isCaptain} onChange={(e) => onToggleCaptain(player.playerId, e.target.checked)} className="h-4 w-4 rounded border-slate-300" /></td>
                  <td className="px-3 py-2">{player.defaultCapNumber}</td>
                  <td className="px-3 py-2"><input type="number" value={player.tournamentCapNumber} onChange={(e) => onUpdateTournamentCapNumber(player.playerId, e.target.value)} className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1" /></td>
                  <td className="px-3 py-2"><LicenseStatus verified={player.licenseVerified} verifiedAt={player.licenseVerifiedAt} verifiedBy={player.licenseVerifiedBy} validUntil={player.licenseValidUntil} /></td>
                </RosterPlayerRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};