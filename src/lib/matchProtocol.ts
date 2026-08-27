import { getClubIdsByNames, getMatchRoster, type MatchRosterWithPlayers } from "./rosters";
import { supabase } from "./supabase";
import type { Match } from "../types/wpolo";

export type ProtocolTeam = "home" | "away";
export type ProtocolEventKind = "goal" | "exclusion" | "exclusion_substitution" | "brutality" | "penalty" | "timeout" | "yellow_card" | "red_card" | "double_exclusion" | "official_penalty" | "shootout_goal" | "shootout_miss";

export const PROTOCOL_EVENT_OPTIONS: Array<{ value: ProtocolEventKind; label: string; symbol: string; group: "goal" | "foul" | "other" }> = [
  { value: "goal", label: "Gol", symbol: "G", group: "goal" },
  { value: "exclusion", label: "Wykluczenie na 20 sekund", symbol: "W", group: "foul" },
  { value: "penalty", label: "Rzut karny", symbol: "K", group: "foul" },
  { value: "exclusion_substitution", label: "Wykluczenie z prawem zamiany", symbol: "WZ", group: "foul" },
  { value: "brutality", label: "Wykluczenie za brutalność", symbol: "WB", group: "foul" },
  { value: "timeout", label: "Time-out", symbol: "To", group: "other" },
  { value: "yellow_card", label: "Żółta kartka", symbol: "ŻK", group: "other" },
  { value: "red_card", label: "Czerwona kartka", symbol: "CZK", group: "other" },
  { value: "double_exclusion", label: "Wykluczenie obustronne", symbol: "", group: "other" },
  { value: "official_penalty", label: "Rzut karny za działanie oficjela", symbol: "Kof", group: "other" },
  { value: "shootout_goal", label: "Gol w serii rzutów karnych", symbol: "G", group: "other" },
  { value: "shootout_miss", label: "Niewykorzystany rzut karny w serii", symbol: "G×", group: "other" },
];

export type ProtocolPlayer = { id: string; slot: number; capNumber: number; name: string; isGoalkeeper: boolean; isCaptain: boolean };
export type ProtocolEvent = {
  id: string;
  period: 1 | 2 | 3 | 4 | "PS";
  clock: string;
  team: ProtocolTeam;
  playerId: string | null;
  kind: ProtocolEventKind;
  reason?: string;
  grossUnsporting?: boolean;
  createdAt: string;
};

export type MatchProtocolDraft = {
  version: 2;
  matchId: string;
  status: "setup" | "live" | "submitted" | "approved";
  homePlayers: ProtocolPlayer[];
  awayPlayers: ProtocolPlayer[];
  homeCoach: string;
  awayCoach: string;
  homeOfficial1: string;
  homeOfficial2: string;
  awayOfficial1: string;
  awayOfficial2: string;
  referee1: string;
  referee2: string;
  delegateName: string;
  protocolSecretary: string;
  secretary1: string;
  secretary2: string;
  timeSecretary1: string;
  timeSecretary2: string;
  goalSecretary1: string;
  goalSecretary2: string;
  homeCaps: string;
  awayCaps: string;
  events: ProtocolEvent[];
  refereeNotes: string;
  protest: boolean;
  finishedAt: string;
  currentPeriod: 1 | 2 | 3 | 4 | "PS";
  shootoutFirstTeam: ProtocolTeam | null;
  homeMvpPlayerId: string;
  awayMvpPlayerId: string;
  closedAt?: string;
  closedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  updatedAt?: string;
};

export type ProtocolContext = { homeRoster: MatchRosterWithPlayers | null; awayRoster: MatchRosterWithPlayers | null; homePlayers: ProtocolPlayer[]; awayPlayers: ProtocolPlayer[] };

const key = (matchId: string) => `wpolo:private-match-protocol:${matchId}`;
const LOCAL_PROTOCOL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const blankProtocol = (matchId: string): MatchProtocolDraft => ({ version: 2, matchId, status: "setup", homePlayers: [], awayPlayers: [], homeCoach: "", awayCoach: "", homeOfficial1: "", homeOfficial2: "", awayOfficial1: "", awayOfficial2: "", referee1: "", referee2: "", delegateName: "", protocolSecretary: "", secretary1: "", secretary2: "", timeSecretary1: "", timeSecretary2: "", goalSecretary1: "", goalSecretary2: "", homeCaps: "jasne", awayCaps: "ciemne", events: [], refereeNotes: "", protest: false, finishedAt: "", currentPeriod: 1, shootoutFirstTeam: null, homeMvpPlayerId: "", awayMvpPlayerId: "" });
export function loadProtocol(matchId: string): MatchProtocolDraft {
  try {
    const raw = localStorage.getItem(key(matchId));
    if (!raw) return blankProtocol(matchId);
    const parsed = JSON.parse(raw) as Partial<MatchProtocolDraft> & { status?: string; version?: number };
    const lastUpdate = Date.parse(String(parsed.updatedAt || ""));
    if (Number.isFinite(lastUpdate) && Date.now() - lastUpdate > LOCAL_PROTOCOL_RETENTION_MS) {
      localStorage.removeItem(key(matchId));
      return blankProtocol(matchId);
    }
    const allowed = new Set(PROTOCOL_EVENT_OPTIONS.map(option => option.value));
    const storedStatus = String(parsed.status || "");
    const migratedStatus: MatchProtocolDraft["status"] = storedStatus === "closed" ? "approved" : storedStatus === "draft" ? ((parsed.events?.length || 0) > 0 ? "live" : "setup") : (["setup", "live", "submitted", "approved"].includes(storedStatus) ? storedStatus as MatchProtocolDraft["status"] : "setup");
    return {
      ...blankProtocol(matchId),
      ...parsed,
      version: 2,
      status: migratedStatus,
      events: (parsed.events || []).filter(event => allowed.has(event.kind)).map(event => ({ ...event, clock: normalizeProtocolClock(event.clock) })),
    };
  } catch { return blankProtocol(matchId); }
}
export function saveProtocol(protocol: MatchProtocolDraft) {
  try {
    localStorage.setItem(key(protocol.matchId), JSON.stringify({ ...protocol, updatedAt: protocol.updatedAt || new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}
export function removeLocalProtocol(matchId: string) {
  try { localStorage.removeItem(key(matchId)); } catch { /* storage may be unavailable */ }
}

export type ProtocolSyncResult = { updatedAt: string; protocol: MatchProtocolDraft };

export async function loadRemoteProtocol(matchId: string): Promise<ProtocolSyncResult | null> {
  const { data, error } = await supabase
    .from("match_protocols")
    .select("protocol_data, client_updated_at")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.protocol_data) return null;
  const protocol = data.protocol_data as MatchProtocolDraft;
  return { protocol: { ...blankProtocol(matchId), ...protocol, matchId }, updatedAt: data.client_updated_at };
}

export async function saveRemoteProtocol(protocol: MatchProtocolDraft): Promise<string> {
  const updatedAt = protocol.updatedAt || new Date().toISOString();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) throw new Error("Brak aktywnej sesji użytkownika.");
  const { error } = await supabase.from("match_protocols").upsert({
    match_id: protocol.matchId,
    protocol_data: { ...protocol, updatedAt },
    client_updated_at: updatedAt,
    updated_at: new Date().toISOString(),
    updated_by: authData.user.id,
  }, { onConflict: "match_id" });
  if (error) throw error;
  return updatedAt;
}

export async function listRemoteProtocolStatuses(matchIds: string[]): Promise<Record<string, MatchProtocolDraft["status"]>> {
  if (!matchIds.length) return {};
  const { data, error } = await supabase.from("match_protocols").select("match_id,protocol_data").in("match_id", matchIds);
  if (error) throw error;
  return Object.fromEntries((data || []).map(row => [String(row.match_id), (row.protocol_data as MatchProtocolDraft)?.status || "setup"]));
}

export async function approveRemoteMatchProtocol(match: Match, _approvedBy: string): Promise<MatchProtocolDraft> {
  const { data, error } = await supabase.rpc("approve_match_protocol", { target_match_id: match.id });
  if (error) throw error;
  const approved = { ...blankProtocol(match.id), ...(data as MatchProtocolDraft), matchId: match.id };
  removeLocalProtocol(match.id);
  return approved;
}

export async function reopenRemoteMatchProtocol(matchId: string): Promise<MatchProtocolDraft> {
  const { data, error } = await supabase.rpc("reopen_match_protocol", { target_match_id: matchId });
  if (error) throw error;
  const reopened = { ...blankProtocol(matchId), ...(data as MatchProtocolDraft), matchId };
  saveProtocol(reopened);
  return reopened;
}

export function exportProtocolFile(protocol: MatchProtocolDraft) {
  const payload = { format: "wpolo-match-protocol", exportedAt: new Date().toISOString(), protocol: { ...protocol, updatedAt: protocol.updatedAt || new Date().toISOString() } };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `protokol-offline-${protocol.matchId}.wpolo.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importProtocolFile(file: File, expectedMatchId: string): Promise<MatchProtocolDraft> {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("Plik protokołu może mieć maksymalnie 5 MB.");
  const parsed = JSON.parse(await file.text()) as { format?: string; protocol?: MatchProtocolDraft };
  if (parsed.format !== "wpolo-match-protocol" || !parsed.protocol) throw new Error("To nie jest plik protokołu wpolo.pl.");
  if (parsed.protocol.matchId !== expectedMatchId) throw new Error("Plik dotyczy innego meczu.");
  if (parsed.protocol.version !== 2 || !Array.isArray(parsed.protocol.events)) throw new Error("Plik protokołu ma nieobsługiwany format.");
  if (parsed.protocol.events.length > 1000) throw new Error("Plik zawiera zbyt wiele wydarzeń.");
  if (!Array.isArray(parsed.protocol.homePlayers) || !Array.isArray(parsed.protocol.awayPlayers) || parsed.protocol.homePlayers.length > 15 || parsed.protocol.awayPlayers.length > 15) {
    throw new Error("Plik zawiera nieprawidłowe składy.");
  }
  const allowedStatuses = new Set(["setup", "live", "submitted"]);
  if (!allowedStatuses.has(parsed.protocol.status)) throw new Error("Nie można importować zatwierdzonego protokołu.");
  for (const event of parsed.protocol.events) {
    if (!event || typeof event.id !== "string" || !["home", "away"].includes(event.team) || typeof event.kind !== "string") {
      throw new Error("Plik zawiera nieprawidłowe wydarzenie.");
    }
  }
  return { ...blankProtocol(expectedMatchId), ...parsed.protocol, matchId: expectedMatchId, updatedAt: new Date().toISOString() };
}

function mapPlayers(roster: MatchRosterWithPlayers | null): ProtocolPlayer[] {
  return (roster?.players || []).slice(0, 15).map(entry => ({ id: entry.player.id, slot: entry.slot, capNumber: entry.slot, name: `${entry.player.first_name} ${entry.player.last_name}`.trim(), isGoalkeeper: entry.is_goalkeeper, isCaptain: entry.is_captain }));
}

export async function loadProtocolContext(match: Match): Promise<ProtocolContext> {
  const ids = await getClubIdsByNames([match.home, match.away]);
  const [homeRoster, awayRoster] = await Promise.all([
    ids.get(match.home) ? getMatchRoster(match.id, ids.get(match.home)!) : Promise.resolve(null),
    ids.get(match.away) ? getMatchRoster(match.id, ids.get(match.away)!) : Promise.resolve(null),
  ]);
  return { homeRoster, awayRoster, homePlayers: mapPlayers(homeRoster), awayPlayers: mapPlayers(awayRoster) };
}

export function protocolScore(events: ProtocolEvent[]) { return events.reduce((score, event) => { if (event.kind === "goal" || event.kind === "shootout_goal") score[event.team] += 1; return score; }, { home: 0, away: 0 }); }
export function playerGoals(events: ProtocolEvent[], playerId: string) { return events.filter(event => event.kind === "goal" && event.playerId === playerId).length; }
export function playerMajorFouls(events: ProtocolEvent[], playerId: string) { return playerMajorFoulEvents(events, playerId).length; }
export function playerMajorFoulEvents(events: ProtocolEvent[], playerId: string) { return events.filter(event => ["exclusion", "penalty", "exclusion_substitution", "brutality", "double_exclusion"].includes(event.kind) && event.playerId === playerId); }
export function eventSymbol(kind: ProtocolEventKind) { return PROTOCOL_EVENT_OPTIONS.find(option => option.value === kind)?.symbol ?? ""; }
export function eventLabel(kind: ProtocolEventKind) { return PROTOCOL_EVENT_OPTIONS.find(option => option.value === kind)?.label ?? kind; }

export function normalizeProtocolClock(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  const padded = digits.padStart(4, "0");
  const minutes = Math.min(99, Number(padded.slice(0, 2)) || 0);
  const seconds = Math.min(59, Number(padded.slice(2)) || 0);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const requiresDisciplinaryDecision = (kind: ProtocolEventKind) => ["yellow_card", "red_card", "exclusion_substitution", "brutality"].includes(kind);
