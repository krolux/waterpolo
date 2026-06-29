import React from "react";
import { LicenseStatus } from "./LicenseStatus";
import type { Player } from "../../types/club";

type PlayerTableProps = {
  players: Player[];
};

export const PlayerTable: React.FC<PlayerTableProps> = ({ players }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left text-gray-700">
        <thead className="text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Domyślny nr</th>
            <th className="px-3 py-2">Imię</th>
            <th className="px-3 py-2">Nazwisko</th>
            <th className="px-3 py-2">Płeć</th>
            <th className="px-3 py-2">Rocznik</th>
            <th className="px-3 py-2">Nr licencji</th>
            <th className="px-3 py-2">Klub wypożyczający</th>
            <th className="px-3 py-2">Status licencji</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id} className="border-t border-slate-200">
              <td className="px-3 py-2">{player.capNumber}</td>
              <td className="px-3 py-2">{player.firstName}</td>
              <td className="px-3 py-2">{player.lastName}</td>
              <td className="px-3 py-2">{player.gender}</td>
              <td className="px-3 py-2">{player.birthYear}</td>
              <td className="px-3 py-2">{player.licenseNumber}</td>
              <td className="px-3 py-2">{player.loanClub || player.loanFromClub || "-"}</td>
              <td className="px-3 py-2"><LicenseStatus licenseStatus={player.licenseStatus} licenseValidUntil={player.licenseValidUntil} verifiedAt={player.licenseVerifiedAt} verifiedBy={player.licenseVerifiedBy} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};