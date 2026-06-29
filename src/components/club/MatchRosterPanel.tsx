import React from "react";
import { LicenseStatus } from "./LicenseStatus";
import { RosterCounters } from "./RosterCounters";
import { RosterPlayerRow } from "./RosterPlayerRow";
import { RosterToolbar } from "./RosterToolbar";
import type { RosterPanelPlayer } from "../../hooks/useRosterPanel";

type MatchRosterPanelProps = {
  players: RosterPanelPlayer[];
  count: number;
  limitReached: boolean;
  onCopyPreviousMatch: () => void;
  onCopyPreviousTournament: () => void;
  onCopyLastRoster: () => void;
  onClear: () => void;
  onRemoveFromMatch: (playerId: string) => void;
  onMoveMatchPlayer: (playerId: string, direction: "up" | "down") => void;
  onUpdateMatchCapNumber: (playerId: string, value: string) => void;
  onToggleGoalkeeper: (playerId: string, checked: boolean) => void;
  onToggleCaptain: (playerId: string, checked: boolean) => void;
};

export const MatchRosterPanel: React.FC<MatchRosterPanelProps> = ({
  players,
  count,
  limitReached,
  onCopyPreviousMatch,
  onCopyPreviousTournament,
  onCopyLastRoster,
  onClear,
  onRemoveFromMatch,
  onMoveMatchPlayer,
  onUpdateMatchCapNumber,
  onToggleGoalkeeper,
  onToggleCaptain,
}) => {
  return (
    <div className="space-y-2">
      <RosterCounters title="Lista meczowa" count={count} limit={15} limitReached={limitReached} />
      <RosterToolbar
        actions={[
          { label: "Z poprzedniego meczu", onClick: onCopyPreviousMatch },
          { label: "Z poprzedniego turnieju", onClick: onCopyPreviousTournament },
          { label: "Z ostatniej listy", onClick: onCopyLastRoster },
          { label: "Wyczyść listę meczową", onClick: onClear },
        ]}
      />
      {players.length === 0 ? (
        <div className="text-sm text-gray-500">Dodaj zawodnikow z listy turniejowej, aby utworzyc liste meczowa.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/70">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2">Imię</th>
                <th className="px-3 py-2">Nazwisko</th>
                <th className="px-3 py-2">GK</th>
                <th className="px-3 py-2">C</th>
                <th className="px-3 py-2">Meczowy nr</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <RosterPlayerRow key={player.playerId}>
                  <td className="px-3 py-2"><button onClick={() => onRemoveFromMatch(player.playerId)} className="rounded-lg border bg-white px-2 py-1 hover:bg-gray-50">←</button></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => onMoveMatchPlayer(player.playerId, "up")} disabled={index === 0} className={index === 0 ? "rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 text-gray-400 cursor-not-allowed" : "rounded-lg border bg-white px-2 py-1 hover:bg-gray-50"}>▲</button>
                      <button onClick={() => onMoveMatchPlayer(player.playerId, "down")} disabled={index === players.length - 1} className={index === players.length - 1 ? "rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 text-gray-400 cursor-not-allowed" : "rounded-lg border bg-white px-2 py-1 hover:bg-gray-50"}>▼</button>
                    </div>
                  </td>
                  <td className="px-3 py-2">{player.firstName}</td>
                  <td className="px-3 py-2">
                    <div>{player.lastName} {player.isCaptain ? "(C)" : ""}</div>
                    {(player.loanClub || player.loanFromClub) ? <div className="text-xs text-gray-500">Wypozyczony z: {player.loanClub || player.loanFromClub}</div> : null}
                  </td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!player.isGoalkeeper} onChange={(e) => onToggleGoalkeeper(player.playerId, e.target.checked)} className="h-4 w-4 rounded border-slate-300" /></td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!player.isCaptain} onChange={(e) => onToggleCaptain(player.playerId, e.target.checked)} className="h-4 w-4 rounded border-slate-300" /></td>
                  <td className="px-3 py-2"><input type="number" value={player.matchCapNumber} onChange={(e) => onUpdateMatchCapNumber(player.playerId, e.target.value)} className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1" /></td>
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