export type RosterSaveMode = "tournament" | "match";

export type RosterLicenseStatus = "approved" | "requires_approval";

export type SaveRosterPlayerPayload = {
  slot: number;
  playerId: string;
  displayOrder?: number;
  fullName: string;
  birthYear: number;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  licenseNumber: string;
  loanClub: string | null;
  licenseValidUntil?: string | null;
  licenseStatus: RosterLicenseStatus;
};

export type SaveRosterPayload = {
  mode: RosterSaveMode;
  clubName: string;
  matchId?: string;
  tournamentId?: string;
  submittedByProfileId?: string | null;
  submittedByName?: string | null;
  players: SaveRosterPlayerPayload[];
  savedAt: string;
  updatedAt?: string;
};

export function resolveRosterLicenseStatus(validUntil?: string, targetDate?: string): RosterLicenseStatus {
  if (!validUntil) return "requires_approval";

  const checkDate = targetDate ? new Date(targetDate) : new Date();
  const expirationDate = new Date(validUntil);
  if (Number.isNaN(expirationDate.getTime())) return "requires_approval";

  return expirationDate.getTime() >= checkDate.getTime() ? "approved" : "requires_approval";
}

// Prepared row contracts for future Supabase persistence (no DB migration in this step).
export type TournamentRosterRow = {
  id: string;
  tournament_id: string;
  club_name: string;
  saved_at: string;
};

export type TournamentRosterPlayerRow = {
  id: string;
  roster_id: string;
  player_id: string;
  slot: number;
  is_goalkeeper: boolean;
  is_captain: boolean;
  license_number: string;
  loan_club: string | null;
  license_status: RosterLicenseStatus;
};

export type MatchRosterRow = {
  id: string;
  match_id: string;
  club_name: string;
  tournament_id: string | null;
  saved_at: string;
};

export type MatchRosterPlayerRow = {
  id: string;
  roster_id: string;
  player_id: string;
  slot: number;
  is_goalkeeper: boolean;
  is_captain: boolean;
  license_number: string;
  loan_club: string | null;
  license_status: RosterLicenseStatus;
};

export type PlayerLicenseCheckRow = {
  id: string;
  player_id: string;
  verified: boolean;
  valid_until: string | null;
  checked_by: string | null;
  checked_at: string | null;
};
