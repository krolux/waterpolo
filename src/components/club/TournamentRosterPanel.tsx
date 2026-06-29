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
  onMoveTournamentPlayer: (playerId: string, direction: "up" | "down") => void;
  onRemoveFromTournament: (playerId: string) => void;
};

export const TournamentRosterPanel: React.FC<TournamentRosterPanelProps> = ({
  availablePlayers,
  slots,
  count,
  limitReached,
  onAddPlayers,
  onAddPlayer,
  onCopy,
  onMoveTournamentPlayer,
  onRemoveFromTournament,
}) => {
  return (
    <div className="flex h-full flex-col gap-2">
      <RosterCounters title="Lista turniejowa" count={count} limit={17} limitReached={limitReached} badgeText="Mock" />
      <RosterToolbar
        actions={[
          { label: "Dodaj wielu", onClick: onAddPlayers, disabled: limitReached },
          { label: "Kopiuj", onClick: onCopy },
        ]}
      />
      <div className="grid flex-1 items-stretch gap-2 lg:grid-cols-2">
        {availablePlayers.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white/80 p-2 text-sm text-gray-500">Wszyscy zawodnicy są już na liście turniejowej.</div>
        ) : (
          <div className="flex h-full flex-col overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Zawodnicy klubu</div>
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
                {availablePlayers.map((player) => (
                  <RosterPlayerRow key={player.playerId}>
                    <td className="px-2 py-1.5">
                      <div className="font-medium">{player.firstName} {player.lastName}</div>
                      {(player.loanClub || player.loanFromClub) ? <div className="text-xs text-gray-500">Wypozyczony z: {player.loanClub || player.loanFromClub}</div> : null}
                    </td>
                    <td className="px-2 py-1.5">{player.defaultCapNumber}</td>
                    <td className="px-2 py-1.5"><LicenseStatus verified={player.licenseVerified} verifiedAt={player.licenseVerifiedAt} verifiedBy={player.licenseVerifiedBy} validUntil={player.licenseValidUntil} /></td>
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

        <div className="flex h-full flex-col overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Lista turniejowa 1-17</div>
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-1.5">Slot</th>
                <th className="px-2 py-1.5">Zawodnik</th>
                <th className="px-2 py-1.5">Nr</th>
                <th className="px-2 py-1.5">Rok</th>
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
                    {slot.player ? slot.player.defaultCapNumber : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    {slot.player ? slot.player.birthYear : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    {slot.player ? <LicenseStatus verified={slot.player.licenseVerified} verifiedAt={slot.player.licenseVerifiedAt} verifiedBy={slot.player.licenseVerifiedBy} validUntil={slot.player.licenseValidUntil} /> : <span className="text-gray-300">—</span>}
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