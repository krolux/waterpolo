export type RosterSaveMode = "tournament" | "match";

export type RosterLicenseStatus = "verified" | "expiring_soon" | "unverified";

export type SaveRosterPlayerPayload = {
  slot: number;
  playerId: string;
  fullName: string;
  birthYear: number;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  licenseNumber: string;
  loanClub: string | null;
  licenseStatus: RosterLicenseStatus;
};

export type SaveRosterPayload = {
  mode: RosterSaveMode;
  clubName: string;
  matchId?: string;
  tournamentId?: string;
  players: SaveRosterPlayerPayload[];
  savedAt: string;
};

export function resolveRosterLicenseStatus(verified: boolean, validUntil?: string): RosterLicenseStatus {
  if (!verified) return "unverified";
  if (!validUntil) return "verified";

  const diff = new Date(validUntil).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  return days <= 30 ? "expiring_soon" : "verified";
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
