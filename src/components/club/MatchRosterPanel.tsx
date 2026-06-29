import React from "react";
import { LicenseStatus } from "./LicenseStatus";
import { RosterCounters } from "./RosterCounters";
import { RosterPlayerRow } from "./RosterPlayerRow";
import { RosterToolbar } from "./RosterToolbar";
import type { RosterSlot } from "../../hooks/useRosterPanel";

type MatchRosterPanelProps = {
  slots: RosterSlot[];
  count: number;
  limitReached: boolean;
  targetDate?: string;
  onCopyPreviousMatch: () => void;
  onCopyPreviousTournament: () => void;
  onCopyLastRoster: () => void;
  onRemoveFromMatch: (playerId: string) => void;
  onMoveMatchPlayer: (playerId: string, direction: "up" | "down") => void;
  onToggleGoalkeeper: (playerId: string, checked: boolean) => void;
  onToggleCaptain: (playerId: string, checked: boolean) => void;
};

export const MatchRosterPanel: React.FC<MatchRosterPanelProps> = ({
  slots,
  count,
  limitReached,
  targetDate,
  onCopyPreviousMatch,
  onCopyPreviousTournament,
  onCopyLastRoster,
  onRemoveFromMatch,
  onMoveMatchPlayer,
  onToggleGoalkeeper,
  onToggleCaptain,
}) => {
  return (
    <div className="flex h-full flex-col gap-2">
      <RosterCounters title="Lista meczowa" count={count} limit={15} limitReached={limitReached} />
      <RosterToolbar
        actions={[
          { label: "Z poprzedniego meczu", onClick: onCopyPreviousMatch },
          { label: "Z poprzedniego turnieju", onClick: onCopyPreviousTournament },
          { label: "Z ostatniej listy", onClick: onCopyLastRoster },
        ]}
      />
      <div className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Lista meczowa 1-15</div>
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="px-2 py-1.5">Slot</th>
              <th className="px-2 py-1.5">Zawodnik</th>
              <th className="px-2 py-1.5">GK</th>
              <th className="px-2 py-1.5">C</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, index) => (
              <RosterPlayerRow key={slot.slotNumber}>
                <td className="px-2 py-1.5 font-semibold text-slate-600">{slot.slotNumber}</td>
                <td className="px-2 py-1.5">
                  {slot.player ? (
                    <>
                      <div className="font-medium">{slot.player.firstName} {slot.player.lastName} {slot.player.isCaptain ? "(C)" : ""}</div>
                      {(slot.player.loanClub || slot.player.loanFromClub) ? <div className="text-xs text-gray-500">Wypozyczony z: {slot.player.loanClub || slot.player.loanFromClub}</div> : null}
                    </>
                  ) : (
                    <span className="text-gray-400">— puste —</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {slot.player ? <input type="checkbox" checked={!!slot.player.isGoalkeeper} onChange={(e) => onToggleGoalkeeper(slot.player!.playerId, e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> : null}
                </td>
                <td className="px-2 py-1.5">
                  {slot.player ? <input type="checkbox" checked={!!slot.player.isCaptain} onChange={(e) => onToggleCaptain(slot.player!.playerId, e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> : null}
                </td>
                <td className="px-2 py-1.5">
                  {slot.player ? <LicenseStatus licenseValidUntil={slot.player.licenseValidUntil} targetDate={targetDate} verifiedAt={slot.player.licenseVerifiedAt} verifiedBy={slot.player.licenseVerifiedBy} /> : null}
                </td>
                <td className="px-2 py-1.5">
                  {slot.player ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onMoveMatchPlayer(slot.player!.playerId, "up")} disabled={index === 0} className={index === 0 ? "rounded border border-gray-300 bg-gray-100 px-1.5 py-1 text-gray-400 cursor-not-allowed" : "rounded border bg-white px-1.5 py-1 hover:bg-gray-50"}>▲</button>
                      <button onClick={() => onMoveMatchPlayer(slot.player!.playerId, "down")} disabled={index === slots.length - 1} className={index === slots.length - 1 ? "rounded border border-gray-300 bg-gray-100 px-1.5 py-1 text-gray-400 cursor-not-allowed" : "rounded border bg-white px-1.5 py-1 hover:bg-gray-50"}>▼</button>
                      <button onClick={() => onRemoveFromMatch(slot.player!.playerId)} className="rounded border bg-white px-2 py-1 hover:bg-gray-50">←</button>
                    </div>
                  ) : null}
                </td>
              </RosterPlayerRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};