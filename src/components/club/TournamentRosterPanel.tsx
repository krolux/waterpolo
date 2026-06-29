import React from "react";
import { LicenseStatus } from "./LicenseStatus";
import { RosterCounters } from "./RosterCounters";
import { RosterPlayerRow } from "./RosterPlayerRow";
import { RosterToolbar } from "./RosterToolbar";
import type { RosterPanelPlayer, RosterSlot } from "../../hooks/useRosterPanel";

type TournamentRosterPanelProps = {
  availablePlayers: RosterPanelPlayer[];
  slots: RosterSlot[];
  count: number;
  limitReached: boolean;
  onAddPlayers: () => void;
  onAddPlayer: (playerId: string) => void;
  onCopy: () => void;
  onClear: () => void;
  onMoveTournamentPlayer: (playerId: string, direction: "up" | "down") => void;
  onRemoveFromTournament: (playerId: string) => void;
  onToggleGoalkeeper: (playerId: string, checked: boolean) => void;
  onToggleCaptain: (playerId: string, checked: boolean) => void;
};

export const TournamentRosterPanel: React.FC<TournamentRosterPanelProps> = ({
  availablePlayers,
  slots,
  count,
  limitReached,
  onAddPlayers,
  onAddPlayer,
  onCopy,
  onClear,
  onMoveTournamentPlayer,
  onRemoveFromTournament,
  onToggleGoalkeeper,
  onToggleCaptain,
}) => {
  return (
    <div className="space-y-2 max-w-[620px]">
      <RosterCounters title="Lista turniejowa" count={count} limit={17} limitReached={limitReached} badgeText="Mock" />
      <RosterToolbar
        actions={[
          { label: "Dodaj wielu", onClick: onAddPlayers, disabled: limitReached },
          { label: "Kopiuj", onClick: onCopy },
          { label: "Wyczyść listę turniejową", onClick: onClear },
        ]}
      />
      <div className="grid gap-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {availablePlayers.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white/70 p-2 text-sm text-gray-500">Wszyscy zawodnicy są już na liście turniejowej.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/70">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-2 py-1.5">Zawodnik</th>
                  <th className="px-2 py-1.5">Nr</th>
                  <th className="px-2 py-1.5 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {availablePlayers.map((player) => (
                  <RosterPlayerRow key={player.playerId}>
                    <td className="px-2 py-1.5">
                      <div className="font-medium">{player.firstName} {player.lastName}</div>
                      {(player.loanClub || player.loanFromClub) ? <div className="text-xs text-gray-500">Wypozyczony z: {player.loanClub || player.loanFromClub}</div> : null}
                    </td>
                    <td className="px-2 py-1.5">{player.defaultCapNumber}</td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        onClick={() => onAddPlayer(player.playerId)}
                        disabled={limitReached}
                        className={limitReached ? "rounded border border-gray-300 bg-gray-100 px-2 py-1 text-gray-400 cursor-not-allowed" : "rounded border bg-white px-2 py-1 hover:bg-gray-50"}
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

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white/70">
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
                        <div className="font-medium">{slot.player.firstName} {slot.player.lastName}</div>
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
                    {slot.player ? <LicenseStatus verified={slot.player.licenseVerified} verifiedAt={slot.player.licenseVerifiedAt} verifiedBy={slot.player.licenseVerifiedBy} validUntil={slot.player.licenseValidUntil} /> : null}
                  </td>
                  <td className="px-2 py-1.5">
                    {slot.player ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onMoveTournamentPlayer(slot.player!.playerId, "up")} disabled={index === 0} className={index === 0 ? "rounded border border-gray-300 bg-gray-100 px-1.5 py-1 text-gray-400 cursor-not-allowed" : "rounded border bg-white px-1.5 py-1 hover:bg-gray-50"}>▲</button>
                        <button onClick={() => onMoveTournamentPlayer(slot.player!.playerId, "down")} disabled={index === slots.length - 1} className={index === slots.length - 1 ? "rounded border border-gray-300 bg-gray-100 px-1.5 py-1 text-gray-400 cursor-not-allowed" : "rounded border bg-white px-1.5 py-1 hover:bg-gray-50"}>▼</button>
                        <button onClick={() => onRemoveFromTournament(slot.player!.playerId)} className="rounded border bg-white px-2 py-1 hover:bg-gray-50">←</button>
                      </div>
                    ) : null}
                  </td>
                </RosterPlayerRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};