import { supabase } from './supabase';

// Exact legacy alias only. Never use substring matching for club identity.
export const legacyClubName = 'Job Center Mega-Invest Poland WTS Polonia Bytom';
export const currentClubName = 'WTS Polonia Bytom';
export const normalizeClubName = (name: string) => name.trim() === legacyClubName ? currentClubName : name.trim();
type Club = { id: string; name: string; display_name?: string | null };
let clubs: Club[] = [];
let pending: Promise<void> | undefined;
export async function refreshClubIdentity() {
  if (!pending) pending = (async () => {
    const { data, error } = await supabase.from('clubs').select('*');
    if (error) throw error;
    clubs = data || [];
  })().finally(() => { pending = undefined; });
  await pending;
}
export function clubIdForName(name: string): string | undefined {
  const matches = clubs.filter(c => normalizeClubName(c.name) === normalizeClubName(name));
  return matches.length === 1 ? String(matches[0].id) : undefined;
}
export function clubDisplayName(name: string, id?: string | null) {
  const club = id ? clubs.find(c => String(c.id) === String(id)) : clubs.find(c => String(c.id) === clubIdForName(name));
  return normalizeClubName(club?.display_name || club?.name || name);
}
export function resolveMatchClubs<T extends Record<string, any>>(row: T): T {
  const homeClubId = row.home_club_id ?? row.homeClubId ?? clubIdForName(row.home || '');
  const awayClubId = row.away_club_id ?? row.awayClubId ?? clubIdForName(row.away || '');
  return { ...row, homeClubId, awayClubId, legacyHome: row.legacyHome ?? row.home, legacyAway: row.legacyAway ?? row.away,
    home: clubDisplayName(row.home || '', homeClubId), away: clubDisplayName(row.away || '', awayClubId) };
}
type ClubUser = { role?: string; clubId?: string | null; club?: string };
type ClubMatch = { home: string; away?: string; homeClubId?: string | null; awayClubId?: string | null };
export function isClubSide(user: ClubUser, match: ClubMatch, side: 'home' | 'away') {
  if (!String(user.role).split(/[-+,\s]+/).includes('Club') || !user.clubId) return false;
  const id = side === 'home' ? match.homeClubId : match.awayClubId;
  return String(user.clubId) === String(id || clubIdForName(match[side] || '') || '');
}

export function clubDocumentSegment(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}
export function documentClubMatches(identifier: string, match: ClubMatch & { legacyHome?: string; legacyAway?: string }, side: 'home' | 'away') {
  const id = side === 'home' ? match.homeClubId : match.awayClubId;
  const name = match[side] || '';
  const original = (side === 'home' ? match.legacyHome : match.legacyAway) || name;
  const identifiers = new Set([id, clubDocumentSegment(name), clubDocumentSegment(original)]);
  const isBytom = id ? id === clubIdForName(currentClubName) : normalizeClubName(name) === currentClubName;
  if (isBytom) identifiers.add(clubDocumentSegment(legacyClubName));
  return identifiers.has(identifier);
}
