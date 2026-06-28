import React from "react";
import type { TournamentClub } from "../../lib/competitions";
import type { Role } from "../../types/wpolo";

type TournamentClubsProps = {
  tournamentId?: string | null;
  clubs: readonly string[];
  tournamentClubs: TournamentClub[];
  showAddTournamentClubForm?: boolean;
  setShowAddTournamentClubForm?: React.Dispatch<React.SetStateAction<boolean>>;
  tournamentClubFormData?: { clubName: string };
  setTournamentClubFormData?: React.Dispatch<React.SetStateAction<{ clubName: string }>>;
  onAddTournamentClub?: (tournamentId: string) => void;
  onDeleteTournamentClub?: (clubId: string, tournamentId: string) => void;
  currentUser: { name: string; role: Role; club?: string } | null;
  isAdmin: (user: { role: Role }) => boolean;
};

export const TournamentClubs: React.FC<TournamentClubsProps> = ({
  tournamentId,
  clubs,
  tournamentClubs,
  showAddTournamentClubForm,
  setShowAddTournamentClubForm,
  tournamentClubFormData,
  setTournamentClubFormData,
  onAddTournamentClub,
  onDeleteTournamentClub,
  currentUser,
  isAdmin,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-gray-900">Drużyny w turnieju</div>
          <div className="text-sm text-gray-500">Dodaj i usuń kluby przypisane do tego turnieju.</div>
        </div>
        {currentUser && isAdmin(currentUser) && setShowAddTournamentClubForm && (
          <button
            onClick={() => setShowAddTournamentClubForm(prev => !prev)}
            className="text-sm px-2 py-1 text-blue-600 hover:bg-blue-100 rounded transition"
          >
            {showAddTournamentClubForm ? "Ukryj formularz" : "+ Dodaj klub"}
          </button>
        )}
      </div>

      {currentUser &&
        isAdmin(currentUser) &&
        showAddTournamentClubForm &&
        tournamentClubFormData &&
        setTournamentClubFormData &&
        onAddTournamentClub &&
        tournamentId && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={tournamentClubFormData.clubName}
                onChange={e => setTournamentClubFormData({ clubName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wybierz klub</option>
                {clubs.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onAddTournamentClub(tournamentId)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Dodaj klub
              </button>
            </div>
          </div>
        )}

      {tournamentClubs.length === 0 ? (
        <div className="text-sm text-gray-500">Brak przypisanych drużyn do tego turnieju.</div>
      ) : (
        <div className="space-y-2">
          {tournamentClubs.map(club => (
            <div key={club.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span>{club.club_name}</span>
              {currentUser && isAdmin(currentUser) && onDeleteTournamentClub && tournamentId && (
                <button
                  onClick={() => onDeleteTournamentClub(club.id, tournamentId)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Usuń
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
