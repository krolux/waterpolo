import React from "react";
import { LicenseStatus } from "./LicenseStatus";
import { RosterPlayerRow } from "./RosterPlayerRow";
import type { RosterPanelPlayer } from "../../hooks/useRosterPanel";

type RosterSourcePanelProps = {
  title: string;
  players: RosterPanelPlayer[];
  addDisabled: boolean;
  onAdd: (playerId: string) => void;
};

export const RosterSourcePanel: React.FC<RosterSourcePanelProps> = ({
  title,
  players,
  addDisabled,
  onAdd,
}) => {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {players.length === 0 ? (
        <div className="flex-1 rounded-lg border border-slate-200 bg-white/80 p-2 text-sm text-gray-500">Brak zawodników do dodania.</div>
      ) : (
        <div className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-1.5">Zawodnik</th>
                <th className="px-2 py-1.5">Nr</th>
                <th className="px-2 py-1.5">Status</th>
                <th className="px-2 py-1.5 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <RosterPlayerRow key={player.playerId}>
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{player.firstName} {player.lastName}</div>
                    {(player.loanClub || player.loanFromClub) ? <div className="text-xs text-gray-500">Wypozyczony z: {player.loanClub || player.loanFromClub}</div> : null}
                  </td>
                  <td className="px-2 py-1.5">{player.defaultCapNumber}</td>
                  <td className="px-2 py-1.5"><LicenseStatus verified={player.licenseVerified} verifiedAt={player.licenseVerifiedAt} verifiedBy={player.licenseVerifiedBy} validUntil={player.licenseValidUntil} /></td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => onAdd(player.playerId)}
                      disabled={addDisabled}
                      className={addDisabled ? "rounded border border-gray-300 bg-gray-100 px-2 py-1 text-gray-400 cursor-not-allowed" : "rounded border bg-white px-2 py-1 hover:bg-gray-50"}
                    >
                      →
                    </button>
                  </td>
                </RosterPlayerRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
