export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthYear: number;
  capNumber: number;
  licenseNumber: string;
  loanFromClub?: string;
  loanClub?: string;
  licenseVerified: boolean;
  licenseStatus?: "valid" | "expired";
  licenseVerifiedAt?: string;
  licenseVerifiedBy?: string;
  licenseValidUntil?: string;
};

export type RosterPlayer = {
  playerId: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthYear: number;
  licenseNumber: string;
  defaultCapNumber: number;
  tournamentCapNumber: number;
  matchCapNumber: number;
  loanFromClub?: string;
  loanClub?: string;
  licenseVerified: boolean;
  licenseStatus?: "valid" | "expired";
  licenseVerifiedAt?: string;
  licenseVerifiedBy?: string;
  licenseValidUntil?: string;
  isGoalkeeper?: boolean;
  isCaptain?: boolean;
};

export type MatchRoster = {
  matchId: string;
  clubName: string;
  players: RosterPlayer[];
};

export type TournamentRoster = {
  tournamentId: string;
  clubName: string;
  players: RosterPlayer[];
};