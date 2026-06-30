import { supabase } from './supabaseClient';

export type PlayerRow = {
  id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  birth_year: number;
  default_cap_number: number | null;
  license_number: string;
  loan_club_name: string | null;
  active: boolean;
  license_verified_until: string | null;
  license_verified_at?: string | null;
  license_verified_by?: string | null;
  license_status?: 'valid' | 'expired';
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PlayerLicenseStatusRow = {
  player_id: string;
  last_checked_at: string | null;
  valid_until: string | null;
  checked_by_profile_id: string | null;
  checked_by_name: string | null;
  checked_by_role: string | null;
  verification_type: 'match' | 'tournament' | 'manual' | null;
  match_id: string | null;
  tournament_id: string | null;
  status: 'valid' | 'expired';
};

export type MatchRosterSubmissionRow = {
  id: string;
  submitted_by_name: string | null;
  submitted_at: string;
  version: number;
  verification_code: string | null;
};

export type TournamentRosterRow = {
  id: string;
  tournament_id: string;
  club_id: string;
  status: 'draft' | 'submitted' | 'verified';
  submitted_at: string | null;
  verified_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type TournamentRosterPlayerRow = {
  id: string;
  roster_id: string;
  player_id: string;
  slot: number;
  display_order: number | null;
  created_at: string | null;
};

export type MatchRosterRow = {
  id: string;
  match_id: string;
  club_id: string;
  tournament_roster_id: string | null;
  status: 'draft' | 'submitted' | 'verified';
  submitted_at: string | null;
  verified_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type MatchRosterPlayerRow = {
  id: string;
  roster_id: string;
  player_id: string;
  slot: number;
  is_goalkeeper: boolean;
  is_captain: boolean;
  verified_at_match: boolean;
  created_at: string | null;
};

export type PlayerLicenseCheckRow = {
  id: string;
  player_id: string;
  checked_by_profile_id: string | null;
  checked_by_name: string | null;
  checked_by_role: string | null;
  checked_at: string;
  valid_until: string;
  verification_type: 'match' | 'tournament' | 'manual';
  match_id: string | null;
  tournament_id: string | null;
  notes: string | null;
};

export type PlayerCreateInput = {
  clubId: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  birthYear: number;
  defaultCapNumber: number | null;
  licenseNumber: string;
  loanClubName: string | null;
  notes: string | null;
  active: boolean;
};

export type PlayerUpdateInput = PlayerCreateInput;

export type PlayerWithClubName = PlayerRow & {
  club_name?: string | null;
};

export type TournamentRosterPlayerWithPlayer = TournamentRosterPlayerRow & {
  player: PlayerRow;
};

export type MatchRosterPlayerWithPlayer = MatchRosterPlayerRow & {
  player: PlayerRow;
};

export type TournamentRosterWithPlayers = TournamentRosterRow & {
  players: TournamentRosterPlayerWithPlayer[];
};

export type MatchRosterWithPlayers = MatchRosterRow & {
  players: MatchRosterPlayerWithPlayer[];
};

export type ClubLookupRow = {
  id: string;
  name: string;
  logo_url?: string | null;
};

export type MatchRowForPdf = {
  id: string;
  home: string;
  away: string;
  date: string;
  time: string | null;
  location: string;
  tournament_id: string | null;
};

export type TournamentRowForPdf = {
  id: string;
  name: string;
};

export type MatchRosterPdfPayload = {
  clubId: string;
  clubName: string;
  clubLogoUrl: string | null;
  tournamentName: string | null;
  matchHome: string;
  matchAway: string;
  matchDate: string;
  matchTime: string | null;
  matchLocation: string;
  verificationCode: string | null;
  rosterPlayers: Array<{
    slot: number;
    fullName: string;
    birthYear: number;
    licenseNumber: string;
  }>;
};

export type TournamentRosterPdfPayload = {
  clubId: string;
  clubName: string;
  clubLogoUrl: string | null;
  tournamentName: string | null;
  matchHome: string;
  matchAway: string;
  matchDate: string;
  matchTime: string | null;
  matchLocation: string;
  verificationCode: string | null;
  rosterPlayers: Array<{
    slot: number;
    fullName: string;
    birthYear: number;
    licenseNumber: string;
  }>;
};

export type SaveTournamentRosterPlayerInput = {
  playerId: string;
  slot: number;
  displayOrder?: number | null;
};

export type SaveTournamentRosterPayload = {
  tournamentId: string;
  clubId: string;
  submittedByProfileId?: string | null;
  submittedByName?: string | null;
  players: SaveTournamentRosterPlayerInput[];
};

export type SaveMatchRosterPlayerInput = {
  playerId: string;
  slot: number;
  isGoalkeeper?: boolean;
  isCaptain?: boolean;
};

export type SaveMatchRosterPayload = {
  matchId: string;
  clubId: string;
  tournamentRosterId?: string | null;
  submittedByProfileId?: string | null;
  submittedByName?: string | null;
  players: SaveMatchRosterPlayerInput[];
};

export type VerifyPlayerLicensePayload = {
  playerId: string;
  checkedByProfileId?: string | null;
  checkedByName?: string | null;
  checkedByRole?: string | null;
  validUntil: string;
  verificationType?: 'match' | 'tournament' | 'manual';
  matchId?: string | null;
  tournamentId?: string | null;
  notes?: string | null;
};

export function generateRosterVerificationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';

  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `WP-${suffix}`;
}

type PlayerLookup = PlayerRow & {
  club_name?: string | null;
};

async function getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerRow>> {
  if (playerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .in('id', playerIds);

  if (error) throw error;

  const players = (data || []) as PlayerRow[];
  const statusMap = await getPlayerLicenseStatuses(playerIds);
  return new Map(players.map((player) => [player.id, hydratePlayerLicenseStatus(player, statusMap.get(player.id))]));
}

function hydratePlayerLicenseStatus(player: PlayerRow, status: PlayerLicenseStatusRow | undefined): PlayerRow {
  return {
    ...player,
    license_verified_until: status?.valid_until ?? player.license_verified_until,
    license_verified_at: status?.last_checked_at ?? player.license_verified_at ?? null,
    license_verified_by: status?.checked_by_name ?? player.license_verified_by ?? null,
    license_status: status?.status ?? player.license_status ?? 'expired',
  };
}

export async function getPlayerLicenseStatuses(playerIds: string[]): Promise<Map<string, PlayerLicenseStatusRow>> {
  if (playerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('player_license_status')
    .select('*')
    .in('player_id', playerIds);

  if (error) throw error;

  const rows = (data || []) as PlayerLicenseStatusRow[];
  return new Map(rows.map((row) => [row.player_id, row]));
}

export async function getClubIdsByNames(clubNames: string[]): Promise<Map<string, string>> {
  const normalized = Array.from(new Set(clubNames.map((name) => name.trim()).filter(Boolean)));
  if (normalized.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('clubs')
    .select('id,name')
    .in('name', normalized);

  if (error) throw error;

  const rows = (data || []) as ClubLookupRow[];
  return new Map(rows.map((row) => [row.name, row.id]));
}

export async function listClubsForLogoManagement(): Promise<ClubLookupRow[]> {
  const { data, error } = await supabase
    .from('clubs')
    .select('id,name,logo_url')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as ClubLookupRow[];
}

export async function updateClubLogoUrl(clubId: string, logoUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from('clubs')
    .update({ logo_url: logoUrl })
    .eq('id', clubId);

  if (error) throw error;
}

export async function uploadClubLogo(clubId: string, file: File): Promise<string> {
  const extensionMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name || '');
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'png';
  const filePath = `${clubId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

  const { data, error } = await supabase.storage.from('club-logos').upload(filePath, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
  });

  if (error) throw error;
  return (data?.path as string) || filePath;
}

export async function getClubLogoSignedUrl(logoUrl: string, expiresInSec = 60 * 60): Promise<string> {
  if (/^https?:\/\//i.test(logoUrl)) {
    return logoUrl;
  }

  const { data, error } = await supabase.storage.from('club-logos').createSignedUrl(logoUrl, expiresInSec);
  if (error) throw error;
  return data?.signedUrl || logoUrl;
}

export async function getLatestMatchRosterSubmission(matchRosterId: string): Promise<MatchRosterSubmissionRow | null> {
  const { data, error } = await supabase
    .from('roster_submissions')
    .select('id,submitted_by_name,submitted_at,version,verification_code')
    .eq('match_roster_id', matchRosterId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as MatchRosterSubmissionRow | null;
}

export async function getLatestTournamentRosterSubmission(tournamentRosterId: string): Promise<MatchRosterSubmissionRow | null> {
  const { data, error } = await supabase
    .from('roster_submissions')
    .select('id,submitted_by_name,submitted_at,version,verification_code')
    .eq('tournament_roster_id', tournamentRosterId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as MatchRosterSubmissionRow | null;
}

async function loadTournamentRosterPlayers(rosterIds: string[]): Promise<Map<string, TournamentRosterPlayerRow[]>> {
  if (rosterIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('tournament_roster_players')
    .select('*')
    .in('roster_id', rosterIds)
    .order('roster_id', { ascending: true })
    .order('slot', { ascending: true });

  if (error) throw error;

  const grouped = new Map<string, TournamentRosterPlayerRow[]>();
  for (const row of (data || []) as TournamentRosterPlayerRow[]) {
    const list = grouped.get(row.roster_id) || [];
    list.push(row);
    grouped.set(row.roster_id, list);
  }

  return grouped;
}

async function loadMatchRosterPlayers(rosterIds: string[]): Promise<Map<string, MatchRosterPlayerRow[]>> {
  if (rosterIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('match_roster_players')
    .select('*')
    .in('roster_id', rosterIds)
    .order('roster_id', { ascending: true })
    .order('slot', { ascending: true });

  if (error) throw error;

  const grouped = new Map<string, MatchRosterPlayerRow[]>();
  for (const row of (data || []) as MatchRosterPlayerRow[]) {
    const list = grouped.get(row.roster_id) || [];
    list.push(row);
    grouped.set(row.roster_id, list);
  }

  return grouped;
}

function mergeTournamentRosterPlayers(
  rows: TournamentRosterPlayerRow[],
  playersById: Map<string, PlayerRow>
): TournamentRosterPlayerWithPlayer[] {
  return rows
    .map((row) => {
      const player = playersById.get(row.player_id);
      if (!player) return null;
      return { ...row, player };
    })
    .filter((row): row is TournamentRosterPlayerWithPlayer => row !== null);
}

function mergeMatchRosterPlayers(
  rows: MatchRosterPlayerRow[],
  playersById: Map<string, PlayerRow>
): MatchRosterPlayerWithPlayer[] {
  return rows
    .map((row) => {
      const player = playersById.get(row.player_id);
      if (!player) return null;
      return { ...row, player };
    })
    .filter((row): row is MatchRosterPlayerWithPlayer => row !== null);
}

async function replaceTournamentRosterPlayers(rosterId: string, players: SaveTournamentRosterPlayerInput[]) {
  const { error: deleteError } = await supabase
    .from('tournament_roster_players')
    .delete()
    .eq('roster_id', rosterId);

  if (deleteError) throw deleteError;

  if (players.length === 0) {
    return;
  }

  const rows = players.map((player) => ({
    roster_id: rosterId,
    player_id: player.playerId,
    slot: player.slot,
    display_order: player.displayOrder ?? null,
  }));

  const { error: insertError } = await supabase
    .from('tournament_roster_players')
    .insert(rows);

  if (insertError) throw insertError;
}

async function replaceMatchRosterPlayers(rosterId: string, players: SaveMatchRosterPlayerInput[]) {
  const { error: deleteError } = await supabase
    .from('match_roster_players')
    .delete()
    .eq('roster_id', rosterId);

  if (deleteError) throw deleteError;

  if (players.length === 0) {
    return;
  }

  const rows = players.map((player) => ({
    roster_id: rosterId,
    player_id: player.playerId,
    slot: player.slot,
    is_goalkeeper: player.isGoalkeeper ?? false,
    is_captain: player.isCaptain ?? false,
  }));

  const { error: insertError } = await supabase
    .from('match_roster_players')
    .insert(rows);

  if (insertError) throw insertError;
}

export async function listPlayers(clubId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('club_id', clubId)
    .eq('active', true)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) throw error;

  const players = (data || []) as PlayerRow[];
  const statusMap = await getPlayerLicenseStatuses(players.map((player) => player.id));
  return players.map((player) => hydratePlayerLicenseStatus(player, statusMap.get(player.id)));
}

export async function createPlayer(payload: PlayerCreateInput): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .insert({
      club_id: payload.clubId,
      first_name: payload.firstName,
      last_name: payload.lastName,
      gender: payload.gender,
      birth_year: payload.birthYear,
      default_cap_number: payload.defaultCapNumber,
      license_number: payload.licenseNumber,
      loan_club_name: payload.loanClubName,
      notes: payload.notes,
      active: payload.active,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as PlayerRow;
}

export async function updatePlayer(playerId: string, payload: PlayerUpdateInput): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .update({
      club_id: payload.clubId,
      first_name: payload.firstName,
      last_name: payload.lastName,
      gender: payload.gender,
      birth_year: payload.birthYear,
      default_cap_number: payload.defaultCapNumber,
      license_number: payload.licenseNumber,
      loan_club_name: payload.loanClubName,
      notes: payload.notes,
      active: payload.active,
    })
    .eq('id', playerId)
    .select('*')
    .single();

  if (error) throw error;
  return data as PlayerRow;
}

export async function deactivatePlayer(playerId: string): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .update({ active: false })
    .eq('id', playerId)
    .select('*')
    .single();

  if (error) throw error;
  return data as PlayerRow;
}

export async function saveTournamentRoster(payload: SaveTournamentRosterPayload): Promise<TournamentRosterWithPlayers> {
  const submittedAt = new Date().toISOString();

  const { data: roster, error: rosterError } = await supabase
    .from('tournament_rosters')
    .upsert(
      {
        tournament_id: payload.tournamentId,
        club_id: payload.clubId,
        status: 'submitted',
        submitted_at: submittedAt,
      },
      { onConflict: 'tournament_id,club_id' }
    )
    .select('*')
    .single();

  if (rosterError) throw rosterError;

  const rosterRow = roster as TournamentRosterRow;
  await replaceTournamentRosterPlayers(rosterRow.id, payload.players);

  let submittedByProfileId = payload.submittedByProfileId ?? null;
  let submittedByName = payload.submittedByName ?? null;

  if (!submittedByProfileId || !submittedByName) {
    const { data: authData } = await supabase.auth.getUser();
    submittedByProfileId = submittedByProfileId || authData.user?.id || null;

    if (submittedByProfileId && !submittedByName) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', submittedByProfileId)
        .maybeSingle();

      submittedByName = profileData?.display_name || null;
    }
  }

  const { data: priorSubmissions, error: versionError } = await supabase
    .from('roster_submissions')
    .select('version')
    .eq('tournament_roster_id', rosterRow.id)
    .order('version', { ascending: false })
    .limit(1);

  if (versionError) throw versionError;

  const nextVersion = (priorSubmissions && priorSubmissions.length > 0 ? Number((priorSubmissions[0] as { version?: number }).version || 0) : 0) + 1;
  const verificationCode = generateRosterVerificationCode();

  const { error: submissionError } = await supabase
    .from('roster_submissions')
    .insert({
      roster_type: 'tournament',
      tournament_roster_id: rosterRow.id,
      submitted_by_profile_id: submittedByProfileId,
      submitted_by_name: submittedByName,
      submitted_at: submittedAt,
      version: nextVersion,
      verification_code: verificationCode,
    });

  if (submissionError) throw submissionError;

  const fresh = await getTournamentRoster(payload.tournamentId, payload.clubId);
  if (!fresh) {
    throw new Error('Nie udało się pobrać zapisanego składu turniejowego.');
  }

  return fresh;
}

export async function getTournamentRoster(
  tournamentId: string,
  clubId: string
): Promise<TournamentRosterWithPlayers | null> {
  const { data: roster, error: rosterError } = await supabase
    .from('tournament_rosters')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (rosterError) throw rosterError;
  if (!roster) return null;

  const rosterRow = roster as TournamentRosterRow;
  const { data: rosterPlayers, error: rosterPlayersError } = await supabase
    .from('tournament_roster_players')
    .select('*')
    .eq('roster_id', rosterRow.id)
    .order('slot', { ascending: true });

  if (rosterPlayersError) throw rosterPlayersError;

  const playerIds = (rosterPlayers || []).map((row) => row.player_id);
  const playersById = await getPlayersByIds(playerIds);

  return {
    ...rosterRow,
    players: mergeTournamentRosterPlayers(rosterPlayers as TournamentRosterPlayerRow[], playersById),
  };
}

export async function saveMatchRoster(payload: SaveMatchRosterPayload): Promise<MatchRosterWithPlayers> {
  const submittedAt = new Date().toISOString();

  const { data: roster, error: rosterError } = await supabase
    .from('match_rosters')
    .upsert(
      {
        match_id: payload.matchId,
        club_id: payload.clubId,
        tournament_roster_id: payload.tournamentRosterId ?? null,
        status: 'submitted',
        submitted_at: submittedAt,
      },
      { onConflict: 'match_id,club_id' }
    )
    .select('*')
    .single();

  if (rosterError) throw rosterError;

  const rosterRow = roster as MatchRosterRow;
  await replaceMatchRosterPlayers(rosterRow.id, payload.players);

  let submittedByProfileId = payload.submittedByProfileId ?? null;
  let submittedByName = payload.submittedByName ?? null;

  if (!submittedByProfileId || !submittedByName) {
    const { data: authData } = await supabase.auth.getUser();
    submittedByProfileId = submittedByProfileId || authData.user?.id || null;

    if (submittedByProfileId && !submittedByName) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', submittedByProfileId)
        .maybeSingle();

      submittedByName = profileData?.display_name || null;
    }
  }

  const { data: priorSubmissions, error: versionError } = await supabase
    .from('roster_submissions')
    .select('version')
    .eq('match_roster_id', rosterRow.id)
    .order('version', { ascending: false })
    .limit(1);

  if (versionError) throw versionError;

  const nextVersion = (priorSubmissions && priorSubmissions.length > 0 ? Number((priorSubmissions[0] as { version?: number }).version || 0) : 0) + 1;
  const verificationCode = generateRosterVerificationCode();

  const { error: submissionError } = await supabase
    .from('roster_submissions')
    .insert({
      roster_type: 'match',
      match_roster_id: rosterRow.id,
      submitted_by_profile_id: submittedByProfileId,
      submitted_by_name: submittedByName,
      submitted_at: submittedAt,
      version: nextVersion,
      verification_code: verificationCode,
    });

  if (submissionError) throw submissionError;

  const fresh = await getMatchRoster(payload.matchId, payload.clubId);
  if (!fresh) {
    throw new Error('Nie udało się pobrać zapisanego składu meczowego.');
  }

  return fresh;
}

export async function getMatchRoster(matchId: string, clubId: string): Promise<MatchRosterWithPlayers | null> {
  const { data: roster, error: rosterError } = await supabase
    .from('match_rosters')
    .select('*')
    .eq('match_id', matchId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (rosterError) throw rosterError;
  if (!roster) return null;

  const rosterRow = roster as MatchRosterRow;
  const { data: rosterPlayers, error: rosterPlayersError } = await supabase
    .from('match_roster_players')
    .select('*')
    .eq('roster_id', rosterRow.id)
    .order('slot', { ascending: true });

  if (rosterPlayersError) throw rosterPlayersError;

  const playerIds = (rosterPlayers || []).map((row) => row.player_id);
  const playersById = await getPlayersByIds(playerIds);

  return {
    ...rosterRow,
    players: mergeMatchRosterPlayers(rosterPlayers as MatchRosterPlayerRow[], playersById),
  };
}

export async function getMatchRosterPdfPayload(matchId: string, clubId: string): Promise<MatchRosterPdfPayload | null> {
  const [clubResponse, matchResponse] = await Promise.all([
    supabase.from('clubs').select('id,name,logo_url').eq('id', clubId).maybeSingle(),
    supabase.from('matches').select('id,home,away,date,time,location,tournament_id').eq('id', matchId).maybeSingle(),
  ]);

  if (clubResponse.error) throw clubResponse.error;
  if (matchResponse.error) throw matchResponse.error;

  const club = clubResponse.data as ClubLookupRow | null;
  const match = matchResponse.data as MatchRowForPdf | null;

  if (!club || !match) return null;

  const roster = await getMatchRoster(matchId, clubId);
  if (!roster) return null;

  const latestSubmission = await getLatestMatchRosterSubmission(roster.id);

  let tournamentName: string | null = null;
  if (match.tournament_id) {
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id,name')
      .eq('id', match.tournament_id)
      .maybeSingle();

    if (tournamentError) throw tournamentError;
    tournamentName = (tournament as TournamentRowForPdf | null)?.name || null;
  }

  return {
    clubId,
    clubName: club.name,
    clubLogoUrl: club.logo_url || null,
    tournamentName,
    matchHome: match.home,
    matchAway: match.away,
    matchDate: match.date,
    matchTime: match.time,
    matchLocation: match.location,
    verificationCode: latestSubmission?.verification_code || null,
    rosterPlayers: roster.players
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        slot: entry.slot,
        fullName: `${entry.player.first_name} ${entry.player.last_name}`,
        birthYear: entry.player.birth_year,
        licenseNumber: entry.player.license_number,
      })),
  };
}

export async function getTournamentRosterPdfPayload(tournamentId: string, clubId: string): Promise<TournamentRosterPdfPayload | null> {
  const [clubResponse, tournamentResponse] = await Promise.all([
    supabase.from('clubs').select('id,name,logo_url').eq('id', clubId).maybeSingle(),
    supabase.from('tournaments').select('id,name').eq('id', tournamentId).maybeSingle(),
  ]);

  if (clubResponse.error) throw clubResponse.error;
  if (tournamentResponse.error) throw tournamentResponse.error;

  const club = clubResponse.data as ClubLookupRow | null;
  const tournament = tournamentResponse.data as TournamentRowForPdf | null;

  if (!club || !tournament) return null;

  const roster = await getTournamentRoster(tournamentId, clubId);
  if (!roster) return null;

  const latestSubmission = await getLatestTournamentRosterSubmission(roster.id);

  const { data: latestTournamentMatch, error: latestTournamentMatchError } = await supabase
    .from('matches')
    .select('id,home,away,date,time,location,tournament_id')
    .eq('tournament_id', tournamentId)
    .order('date', { ascending: false })
    .order('time', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (latestTournamentMatchError) throw latestTournamentMatchError;

  const match = (latestTournamentMatch as MatchRowForPdf | null) || null;

  return {
    clubId,
    clubName: club.name,
    clubLogoUrl: club.logo_url || null,
    tournamentName: tournament.name,
    matchHome: match?.home || '-',
    matchAway: match?.away || '-',
    matchDate: match?.date || new Date().toISOString().slice(0, 10),
    matchTime: match?.time || null,
    matchLocation: match?.location || '-',
    verificationCode: latestSubmission?.verification_code || null,
    rosterPlayers: roster.players
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        slot: entry.slot,
        fullName: `${entry.player.first_name} ${entry.player.last_name}`,
        birthYear: entry.player.birth_year,
        licenseNumber: entry.player.license_number,
      })),
  };
}

export async function listTournamentRosters(tournamentId: string): Promise<TournamentRosterWithPlayers[]> {
  const { data: rosters, error: rosterError } = await supabase
    .from('tournament_rosters')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('club_id', { ascending: true });

  if (rosterError) throw rosterError;

  const rosterRows = (rosters || []) as TournamentRosterRow[];
  const rosterIds = rosterRows.map((row) => row.id);
  const playersByRosterId = await loadTournamentRosterPlayers(rosterIds);

  const playerIds = Array.from(
    new Set(
      rosterRows.flatMap((row) => (playersByRosterId.get(row.id) || []).map((item) => item.player_id))
    )
  );
  const playersById = await getPlayersByIds(playerIds);

  return rosterRows.map((rosterRow) => ({
    ...rosterRow,
    players: mergeTournamentRosterPlayers(playersByRosterId.get(rosterRow.id) || [], playersById),
  }));
}

export async function verifyPlayerLicense(payload: VerifyPlayerLicensePayload): Promise<PlayerLicenseCheckRow> {
  const { data, error } = await supabase
    .from('player_license_checks')
    .insert({
      player_id: payload.playerId,
      checked_by_profile_id: payload.checkedByProfileId ?? null,
      checked_by_name: payload.checkedByName ?? null,
      checked_by_role: payload.checkedByRole ?? null,
      valid_until: payload.validUntil,
      verification_type: payload.verificationType ?? 'match',
      match_id: payload.matchId ?? null,
      tournament_id: payload.tournamentId ?? null,
      notes: payload.notes ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as PlayerLicenseCheckRow;
}

export async function getPlayerLicenseChecks(playerId: string): Promise<PlayerLicenseCheckRow[]> {
  const { data, error } = await supabase
    .from('player_license_checks')
    .select('*')
    .eq('player_id', playerId)
    .order('checked_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PlayerLicenseCheckRow[];
}