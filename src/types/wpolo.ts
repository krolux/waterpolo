import type { Role as SupaRole } from '../hooks/useSupabaseAuth';

export type Role = SupaRole;

export type StoredFile = { id: string; name: string; mime: string; size: number; path: string; uploadedBy: string; uploadedAt: string; label?: string };
export type UploadLog = { id: string; type: 'comms' | 'roster' | 'protocol' | 'photos'; matchId: string; club?: string | null; user: string; at: string; fileName: string };
export type Match = {
  id: string;
  date: string;
  time?: string;
  round?: string;
  seriesRound?: string | null;
  location: string;
  home: string;
  away: string;
  result?: string;
  shootout?: boolean;
  referees: string[];
  delegate?: string;
  tournamentId?: string | null;
  stageId?: string | null;
  competitionSeasonId?: string | null;
  commsByClub: Record<string, StoredFile | null>;
  rosterByClub: Record<string, StoredFile | null>;
  matchReport?: StoredFile | null;
  reportPhotos: StoredFile[];
  notes?: string;
  uploadsLog: UploadLog[];
  myAvailable?: boolean;
  myAvailabilitySet?: boolean;
  streamUrl?: string | null;
};
export type AppState = { matches: Match[]; users: { name: string; role: Role; club?: string }[] };
export type ProfileRow = {
  id: string;
  display_name: string;
  role: Role;
  club_id: string | null;
  club_name?: string | null;
};
