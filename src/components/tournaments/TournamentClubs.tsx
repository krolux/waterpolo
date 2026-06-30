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
    <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold text-[#061a33]">Drużyny w turnieju</div>
          <div className="text-sm text-slate-500">Dodaj i usuń kluby przypisane do tego turnieju.</div>
        </div>
        {currentUser && isAdmin(currentUser) && setShowAddTournamentClubForm && (
          <button
            onClick={() => setShowAddTournamentClubForm(prev => !prev)}
            className="rounded-lg px-2 py-1 text-sm text-amber-700 transition hover:bg-amber-50"
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
                className="w-full rounded-xl border border-[#dbeafe] bg-white px-3 py-2"
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
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 font-semibold text-slate-950 transition hover:from-amber-400 hover:to-orange-400"
              >
                Dodaj klub
              </button>
            </div>
          </div>
        )}

      {tournamentClubs.length === 0 ? (
        <div className="text-sm text-slate-500">Brak przypisanych drużyn do tego turnieju.</div>
      ) : (
        <div className="space-y-2">
          {tournamentClubs.map(club => (
            <div key={club.id} className="flex items-center justify-between rounded-lg border border-[#dbeafe] bg-white px-3 py-2">
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
