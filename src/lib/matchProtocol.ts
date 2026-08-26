import { getClubIdsByNames, getMatchRoster, type MatchRosterWithPlayers } from "./rosters";
import type { Match } from "../types/wpolo";

export type ProtocolTeam = "home" | "away";
export type ProtocolEventKind = "goal" | "exclusion" | "exclusion_substitution" | "brutality" | "penalty" | "penalty_missed" | "timeout" | "yellow_card" | "red_card" | "double_exclusion" | "official_penalty" | "injury";

export const PROTOCOL_EVENT_OPTIONS: Array<{ value: ProtocolEventKind; label: string; symbol: number }> = [
  { value: "goal", label: "Gol", symbol: 1 },
  { value: "exclusion", label: "Wykluczenie na 20 sekund", symbol: 2 },
  { value: "exclusion_substitution", label: "Wykluczenie z prawem zamiany", symbol: 3 },
  { value: "brutality", label: "Wykluczenie za brutalność", symbol: 4 },
  { value: "penalty", label: "Rzut karny", symbol: 5 },
  { value: "penalty_missed", label: "Niewykorzystany rzut karny", symbol: 6 },
  { value: "timeout", label: "Time-out", symbol: 7 },
  { value: "yellow_card", label: "Żółta kartka", symbol: 8 },
  { value: "red_card", label: "Czerwona kartka", symbol: 10 },
  { value: "double_exclusion", label: "Wykluczenie obustronne", symbol: 11 },
  { value: "official_penalty", label: "Rzut karny za działanie oficjela", symbol: 12 },
  { value: "injury", label: "Kontuzja zawodnika", symbol: 13 },
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
  version: 1;
  matchId: string;
  status: "draft" | "closed";
  homeCoach: string;
  awayCoach: string;
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
  closedAt?: string;
  closedBy?: string;
};

export type ProtocolContext = { homeRoster: MatchRosterWithPlayers | null; awayRoster: MatchRosterWithPlayers | null; homePlayers: ProtocolPlayer[]; awayPlayers: ProtocolPlayer[] };

const key = (matchId: string) => `wpolo:private-match-protocol:${matchId}`;
export const blankProtocol = (matchId: string): MatchProtocolDraft => ({ version: 1, matchId, status: "draft", homeCoach: "", awayCoach: "", secretary1: "", secretary2: "", timeSecretary1: "", timeSecretary2: "", goalSecretary1: "", goalSecretary2: "", homeCaps: "jasne", awayCaps: "ciemne", events: [], refereeNotes: "", protest: false, finishedAt: "" });
export function loadProtocol(matchId: string): MatchProtocolDraft { try { const raw = localStorage.getItem(key(matchId)); return raw ? { ...blankProtocol(matchId), ...JSON.parse(raw) } : blankProtocol(matchId); } catch { return blankProtocol(matchId); } }
export function saveProtocol(protocol: MatchProtocolDraft) { localStorage.setItem(key(protocol.matchId), JSON.stringify(protocol)); }

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

export function protocolScore(events: ProtocolEvent[]) { return events.reduce((score, event) => { if (event.kind === "goal") score[event.team] += 1; return score; }, { home: 0, away: 0 }); }
export function playerGoals(events: ProtocolEvent[], playerId: string) { return events.filter(event => event.kind === "goal" && event.playerId === playerId).length; }
export function playerMajorFouls(events: ProtocolEvent[], playerId: string) { return events.filter(event => ["exclusion", "exclusion_substitution", "brutality", "double_exclusion"].includes(event.kind) && event.playerId === playerId).length; }
export function eventSymbol(kind: ProtocolEventKind) { return PROTOCOL_EVENT_OPTIONS.find(option => option.value === kind)?.symbol ?? ""; }
