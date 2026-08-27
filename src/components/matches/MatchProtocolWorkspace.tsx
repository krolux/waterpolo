import React from "react";
import { Check, ChevronDown, ChevronUp, Cloud, CloudOff, Download, FileCheck2, FileDown, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";
import { generateMatchProtocolPdf } from "../../lib/matchProtocolPdfV2";
import { PROTOCOL_EVENT_OPTIONS, eventLabel, eventSymbol, exportProtocolFile, importProtocolFile, loadProtocol, loadProtocolContext, loadRemoteProtocol, normalizeProtocolClock, playerGoals, playerMajorFoulEvents, playerMajorFouls, protocolScore, reopenRemoteMatchProtocol, requiresDisciplinaryDecision, saveProtocol, saveRemoteProtocol, type MatchProtocolDraft, type ProtocolContext, type ProtocolEvent, type ProtocolEventKind, type ProtocolPlayer, type ProtocolTeam } from "../../lib/matchProtocol";

type User = { name: string; role: Role; club?: string };
const input = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-sky-400";
const isAdminUser = (user: User) => String(user.role).split(/[-+,\s]+/).includes("Admin");
const isDelegate = (user: User, match: Match, delegateName?: string) => isAdminUser(user) || (delegateName || match.delegate) === user.name;
const periodLabel = (p: 1|2|3|4|"PS") => p === "PS" ? "Rzuty karne" : `${["I","II","III","IV"][p - 1]} kwarta`;
const ShootoutMissMark = () => <span aria-label="niewykorzystany rzut karny" className="relative inline-grid h-6 w-6 place-items-center rounded-full border-2 border-red-500 text-xs font-black text-red-700"><span>G</span><span className="absolute h-0.5 w-7 -rotate-[35deg] bg-red-500"/></span>;
const fixedCapNumbers = (players: ProtocolPlayer[]) => players.map(player => player.capNumber === player.slot ? player : { ...player, capNumber: player.slot });
const clockSeconds = (clock: string) => { const [minutes, seconds] = clock.split(":").map(Number); return (minutes || 0) * 60 + (seconds || 0); };

export function MatchProtocolWorkspace({ match, user, onClose, onProtocolChanged, localOnly = false, initialProtocol, onLocalProtocolChange }: { match: Match; user: User; onClose: () => void; onProtocolChanged?: (status: MatchProtocolDraft["status"]) => Promise<void> | void; localOnly?: boolean; initialProtocol?: MatchProtocolDraft; onLocalProtocolChange?: (protocol: MatchProtocolDraft) => void }) {
  const [protocol, setProtocol] = React.useState<MatchProtocolDraft>(() => { const saved = initialProtocol || loadProtocol(match.id); return { ...saved, homePlayers: fixedCapNumbers(saved.homePlayers), awayPlayers: fixedCapNumbers(saved.awayPlayers) }; });
  const [context, setContext] = React.useState<ProtocolContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [team, setTeam] = React.useState<ProtocolTeam>("home");
  const [kind, setKind] = React.useState<ProtocolEventKind>("goal");
  const [playerId, setPlayerId] = React.useState("");
  const [clock, setClock] = React.useState("");
  const [highlightPlayer, setHighlightPlayer] = React.useState<string | null>(null);
  const [highlightFoulPlayer, setHighlightFoulPlayer] = React.useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = React.useState<string | null>(null);
  const [thirdFoulPlayer, setThirdFoulPlayer] = React.useState<ProtocolPlayer | null>(null);
  const [eventMenu, setEventMenu] = React.useState<"foul" | "other" | null>(null);
  const [shootoutTeam, setShootoutTeam] = React.useState<ProtocolTeam>("home");
  const [shootoutPlayerId, setShootoutPlayerId] = React.useState("");
  const [syncReady, setSyncReady] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"loading" | "saved" | "offline" | "syncing" | "error">("loading");
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const menuCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const protocolRef = React.useRef(protocol);
  const importRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (localOnly) { setContext({ homeRoster: null, awayRoster: null, homePlayers: initialProtocol?.homePlayers || [], awayPlayers: initialProtocol?.awayPlayers || [] }); setLoading(false); return; } let active = true; setLoading(true); loadProtocolContext(match).then(v => { if (!active) return; setContext(v); setProtocol(p => ({ ...p, homePlayers: p.homePlayers.length ? p.homePlayers : v.homePlayers, awayPlayers: p.awayPlayers.length ? p.awayPlayers : v.awayPlayers, referee1: p.referee1 || match.referees[0] || "", referee2: p.referee2 || match.referees[1] || "", delegateName: p.delegateName || match.delegate || "" })); }).finally(() => active && setLoading(false)); return () => { active = false; }; }, [match, localOnly, initialProtocol]);
  React.useEffect(() => { protocolRef.current = protocol; }, [protocol]);
  React.useEffect(() => {
    if (localOnly) { setSyncReady(true); setSyncStatus("saved"); setLastSavedAt(initialProtocol?.updatedAt || null); return; }
    let active = true;
    const local = loadProtocol(match.id);
    setSyncReady(false); setSyncStatus("loading");
    loadRemoteProtocol(match.id).then(remote => {
      if (!active) return;
      const localTime = Date.parse(local.updatedAt || "") || 0;
      const remoteTime = Date.parse(remote?.updatedAt || "") || 0;
      const selected = remote && remoteTime > localTime ? remote.protocol : local;
      setProtocol({ ...selected, homePlayers: fixedCapNumbers(selected.homePlayers), awayPlayers: fixedCapNumbers(selected.awayPlayers) });
      setLastSavedAt(remoteTime > localTime ? remote!.updatedAt : local.updatedAt || null);
      setSyncStatus(navigator.onLine ? "saved" : "offline");
    }).catch(() => {
      if (!active) return;
      setProtocol(local); setLastSavedAt(local.updatedAt || null); setSyncStatus(navigator.onLine ? "error" : "offline");
    }).finally(() => { if (active) setSyncReady(true); });
    return () => { active = false; };
  }, [match.id, localOnly, initialProtocol]);
  const syncProtocol = React.useCallback(async (source = protocolRef.current) => {
    const next = { ...source, updatedAt: source.updatedAt || new Date().toISOString() };
    if (localOnly) { onLocalProtocolChange?.(next); setLastSavedAt(next.updatedAt || null); setSyncStatus("saved"); return; }
    saveProtocol(next); setLastSavedAt(next.updatedAt || null);
    if (!navigator.onLine) { setSyncStatus("offline"); return; }
    setSyncStatus("syncing");
    try { await saveRemoteProtocol(next); setSyncStatus("saved"); }
    catch { setSyncStatus(navigator.onLine ? "error" : "offline"); }
  }, [localOnly, onLocalProtocolChange]);
  React.useEffect(() => {
    if (!syncReady) return;
    const next = { ...protocol, updatedAt: new Date().toISOString() };
    if (!localOnly) saveProtocol(next); else onLocalProtocolChange?.(next); setLastSavedAt(next.updatedAt || null);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void syncProtocol(next), 900);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [protocol, syncReady, syncProtocol, localOnly, onLocalProtocolChange]);
  React.useEffect(() => {
    if (localOnly) return;
    const online = () => void syncProtocol({ ...protocolRef.current, updatedAt: new Date().toISOString() });
    const offline = () => setSyncStatus("offline");
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [syncProtocol, localOnly]);
  const homePlayers = protocol.homePlayers.length ? protocol.homePlayers : context?.homePlayers || [], awayPlayers = protocol.awayPlayers.length ? protocol.awayPlayers : context?.awayPlayers || [];
  const players = team === "home" ? homePlayers : awayPlayers;
  const canApprove = localOnly || isDelegate(user, match);
  const canSubmit = localOnly || isAdminUser(user) || user.club === match.home || canApprove;
  const setup = protocol.status === "setup";
  const live = protocol.status === "live";
  const score = protocolScore(protocol.events);
  const timeouts = (side: ProtocolTeam) => protocol.events.filter(e => e.team === side && e.kind === "timeout").length;
  const selectedOption = PROTOCOL_EVENT_OPTIONS.find(o => o.value === kind)!;
  const cardTarget = kind === "yellow_card" || kind === "red_card";
  const staffOptions = cardTarget ? [
    { id: `staff:${team}:coach`, label: `Trener${(team === "home" ? protocol.homeCoach : protocol.awayCoach) ? ` — ${team === "home" ? protocol.homeCoach : protocol.awayCoach}` : ""}` },
    { id: `staff:${team}:official1`, label: `Oficjel 1${(team === "home" ? protocol.homeOfficial1 : protocol.awayOfficial1) ? ` — ${team === "home" ? protocol.homeOfficial1 : protocol.awayOfficial1}` : ""}` },
    { id: `staff:${team}:official2`, label: `Oficjel 2${(team === "home" ? protocol.homeOfficial2 : protocol.awayOfficial2) ? ` — ${team === "home" ? protocol.homeOfficial2 : protocol.awayOfficial2}` : ""}` },
  ] : [];
  const playerIsOut = (id: string, ignoredEventId?: string | null) => {
    const events = protocol.events.filter(event => event.id !== ignoredEventId && event.playerId === id);
    return playerMajorFouls(events, id) >= 3 || events.some(event => event.kind === "exclusion_substitution" || event.kind === "brutality");
  };
  const recordedShootoutEvents = protocol.events.filter(event => event.period === "PS" && ["shootout_goal", "shootout_miss"].includes(event.kind));
  const shootoutFirstTeam = protocol.shootoutFirstTeam || recordedShootoutEvents[0]?.team || null;
  const activeShootoutTeam: ProtocolTeam = shootoutFirstTeam
    ? (recordedShootoutEvents.length % 2 === 0 ? shootoutFirstTeam : shootoutFirstTeam === "home" ? "away" : "home")
    : shootoutTeam;
  const selectedShootoutEvents = protocol.events.filter(event => event.period === "PS" && event.team === activeShootoutTeam && ["shootout_goal", "shootout_miss"].includes(event.kind));
  const selectedShootoutPlayers = (activeShootoutTeam === "home" ? homePlayers : awayPlayers).filter(player => !playerIsOut(player.id));
  const selectedFirstFiveShootoutPlayerIds = new Set(selectedShootoutEvents.slice(0, 5).map(event => event.playerId).filter(Boolean));
  const automaticShootoutPlayerId = selectedShootoutEvents.length >= 5 ? selectedShootoutEvents[selectedShootoutEvents.length % 5]?.playerId || "" : "";
  const visiblePeriods: Array<1|2|3|4|"PS"> = protocol.currentPeriod === "PS" ? [1,2,3,4,"PS"] : ([1,2,3,4] as const).filter(period => period <= Number(protocol.currentPeriod));
  const participantLabel = (event: ProtocolEvent, roster: ProtocolPlayer[]) => {
    const player = roster.find(item => item.id === event.playerId);
    if (player) return `#${player.capNumber} ${player.name}`;
    if (!event.playerId?.startsWith("staff:")) return "Oficjel / drużyna";
    const [, side, role] = event.playerId.split(":");
    const values = side === "home" ? { coach: protocol.homeCoach, official1: protocol.homeOfficial1, official2: protocol.homeOfficial2 } : { coach: protocol.awayCoach, official1: protocol.awayOfficial1, official2: protocol.awayOfficial2 };
    const names = { coach: "Trener", official1: "Oficjel 1", official2: "Oficjel 2" };
    return `${names[role as keyof typeof names]}${values[role as keyof typeof values] ? ` — ${values[role as keyof typeof values]}` : ""}`;
  };
  const disciplinaryReasonPrefix = (eventTeam: ProtocolTeam, eventPlayerId: string | null, eventKind: ProtocolEventKind, period: ProtocolEvent["period"], eventClock: string) => {
    const roster = eventTeam === "home" ? homePlayers : awayPlayers;
    const club = eventTeam === "home" ? match.home : match.away;
    const player = roster.find(item => item.id === eventPlayerId);
    let subject = player ? `zawodnik nr ${player.capNumber}` : "osoba funkcyjna";
    if (eventPlayerId?.startsWith("staff:")) {
      const role = eventPlayerId.split(":")[2];
      const staff = eventTeam === "home" ? { coach: protocol.homeCoach, official1: protocol.homeOfficial1, official2: protocol.homeOfficial2 } : { coach: protocol.awayCoach, official1: protocol.awayOfficial1, official2: protocol.awayOfficial2 };
      const roleLabel = role === "coach" ? "trener" : role === "official1" ? "oficjel 1" : role === "official2" ? "oficjel 2" : "oficjel";
      subject = `${roleLabel}${staff[role as keyof typeof staff] ? ` ${staff[role as keyof typeof staff]}` : ""}`;
    }
    return `${period} ${eventClock} ${subject} drużyny ${club} został ukarany ${eventSymbol(eventKind)} za `;
  };

  const openNew = (side: ProtocolTeam) => { setEditingId(null); setTeam(side); setKind("goal"); setPlayerId(""); setClock(""); setEditorOpen(true); };
  const openEdit = (event: ProtocolEvent) => { if (event.period === "PS") return alert("Próbę w serii rzutów karnych można poprawić przez usunięcie i ponowne dodanie."); setEditingId(event.id); setTeam(event.team); setKind(event.kind); setPlayerId(event.playerId || ""); setClock(event.clock); setEditorOpen(true); };
  const selectKind = (value: ProtocolEventKind) => { setKind(value); setEventMenu(null); if (["timeout", "official_penalty"].includes(value)) setPlayerId(""); };
  const saveEvent = () => {
    const formatted = normalizeProtocolClock(clock);
    if (!formatted) return alert("Wpisz czas zdarzenia.");
    if (clockSeconds(formatted) > 480) return alert("Czas kwarty nie może być większy niż 08:00.");
    if (!["timeout", "official_penalty"].includes(kind) && !playerId) return alert("Wybierz zawodnika.");
    if (kind === "timeout" && !editingId && timeouts(team) >= 2) return alert("Ta drużyna wykorzystała już dwa time-outy.");
    const previous = editingId ? protocol.events.find(e => e.id === editingId) : undefined;
    const editedIndex = editingId ? protocol.events.findIndex(e => e.id === editingId) : protocol.events.length;
    const samePeriodBefore = protocol.events.slice(0, editedIndex).filter(e => e.period === (previous?.period || protocol.currentPeriod));
    const samePeriodAfter = editingId ? protocol.events.slice(editedIndex + 1).filter(e => e.period === previous?.period) : [];
    const prior = samePeriodBefore[samePeriodBefore.length - 1];
    const next = samePeriodAfter[0];
    if (prior && clockSeconds(formatted) > clockSeconds(prior.clock)) return alert(`Czas musi być równy lub mniejszy od poprzedniego zdarzenia (${prior.clock}).`);
    if (next && clockSeconds(formatted) < clockSeconds(next.clock)) return alert(`Czas nie może być mniejszy od następnego zdarzenia (${next.clock}).`);
    const eventPeriod = previous?.period || protocol.currentPeriod;
    const previousReasonTail = previous?.reason?.includes(" za ") ? previous.reason.split(" za ").slice(1).join(" za ") : previous?.reason || "";
    const reason = requiresDisciplinaryDecision(kind) ? `${disciplinaryReasonPrefix(team, playerId || null, kind, eventPeriod, formatted)}${previousReasonTail}` : previous?.reason;
    const event: ProtocolEvent = { id: editingId || crypto.randomUUID(), period: eventPeriod, clock: formatted, team, playerId: playerId || null, kind, reason, grossUnsporting: previous?.grossUnsporting, createdAt: previous?.createdAt || new Date().toISOString() };
    const withoutEdited = protocol.events.filter(e => e.id !== editingId);
    const becomesThirdMajor = playerId && ["exclusion","penalty","exclusion_substitution","brutality","double_exclusion"].includes(kind) && playerMajorFouls(withoutEdited, playerId) === 2;
    setProtocol(p => ({ ...p, events: editingId ? p.events.map(e => e.id === editingId ? event : e) : [...p.events, event] }));
    setEditorOpen(false); setEditingId(null);
    if (becomesThirdMajor) setThirdFoulPlayer(players.find(p => p.id === playerId) || null);
  };
  const startMatch = () => {
    const validateTeam = (label: string, roster: ProtocolPlayer[]) => {
      const active = roster.filter(player => player.name.trim());
      const captains = active.filter(player => player.isCaptain).length;
      const goalkeepers = active.filter(player => player.isGoalkeeper).length;
      if (!active.length) return `Drużyna ${label} nie ma wpisanych zawodników.`;
      if (captains !== 1) return `Drużyna ${label} musi mieć wybranego dokładnie jednego kapitana.`;
      if (active.length === 15 && goalkeepers !== 2) return `Drużyna ${label} przy 15 zawodnikach musi mieć dokładnie 2 bramkarzy.`;
      if (active.length < 15 && (goalkeepers < 1 || goalkeepers > 2)) return `Drużyna ${label} musi mieć jednego lub dwóch bramkarzy.`;
      return null;
    };
    const validationError = validateTeam(match.home, homePlayers) || validateTeam(match.away, awayPlayers);
    if (validationError) return alert(validationError);
    setProtocol(p => ({ ...p, status: "live" }));
  };
  const endQuarter = () => {
    if (protocol.currentPeriod === "PS") return;
    if (protocol.currentPeriod === 4) { const regulation = protocolScore(protocol.events.filter(event => event.period !== "PS")); if (regulation.home !== regulation.away) return alert("Serię rzutów karnych można rozpocząć wyłącznie przy remisie po IV kwarcie."); if (confirm("Zakończyć IV kwartę i przejść do rzutów karnych?")) setProtocol(p => ({ ...p, currentPeriod: "PS" })); return; }
    setProtocol(p => ({ ...p, currentPeriod: (Number(p.currentPeriod) + 1) as 2|3|4 }));
  };
  const undoQuarter = () => {
    if (protocol.currentPeriod === 1) { if (protocol.events.length) return alert("Najpierw usuń wszystkie wydarzenia, aby cofnąć rozpoczęcie meczu."); setProtocol(p => ({ ...p, status: "setup", finishedAt: "" })); return; }
    if (protocol.events.some(event => event.period === protocol.currentPeriod)) return alert("Najpierw usuń wydarzenia zapisane w bieżącej kwarcie.");
    setProtocol(p => ({ ...p, currentPeriod: p.currentPeriod === "PS" ? 4 : (Number(p.currentPeriod) - 1) as 1|2|3, shootoutFirstTeam: p.currentPeriod === "PS" ? null : p.shootoutFirstTeam }));
  };
  const cancelMenuClose = () => { if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current); menuCloseTimer.current = null; };
  const scheduleMenuClose = () => { cancelMenuClose(); menuCloseTimer.current = setTimeout(() => setEventMenu(null), 450); };
  const setDecision = (id: string, field: "reason"|"grossUnsporting", value: string|boolean) => setProtocol(p => ({ ...p, events: p.events.map(e => e.id === id ? { ...e, [field]: value } : e) }));
  const removeEvent = (event: ProtocolEvent) => setProtocol(p => ({
    ...p,
    events: p.events.filter(item => item.id !== event.id),
    refereeNotes: event.reason?.trim()
      ? p.refereeNotes.split(/\r?\n/).filter(line => !line.includes(event.reason!.trim())).join("\n")
      : p.refereeNotes,
  }));
  const submitProtocol = async () => {
    if (!canSubmit) return alert("Protokół może zamknąć gospodarz, delegat lub administrator.");
    if (!protocol.finishedAt) return alert("Wpisz godzinę zakończenia spotkania.");
    if (!protocol.homeMvpPlayerId || !protocol.awayMvpPlayerId) return alert("Wybierz MVP obu drużyn.");
    if (protocol.events.some(e => {
      if (!requiresDisciplinaryDecision(e.kind)) return false;
      const reasonText = e.reason?.includes(" za ") ? e.reason.split(" za ").slice(1).join(" za ").trim() : e.reason?.trim();
      return !reasonText || typeof e.grossUnsporting !== "boolean";
    })) return alert("Uzupełnij powód kary i decyzję o rażącym niesportowym zachowaniu przy wszystkich oznaczonych zdarzeniach.");
    const submitted = { ...protocol, status: "submitted" as const, closedAt: new Date().toISOString(), closedBy: user.name, updatedAt: new Date().toISOString() };
    if (localOnly) { setProtocol(submitted); onLocalProtocolChange?.(submitted); setSyncStatus("saved"); await onProtocolChanged?.("submitted"); return; }
    try {
      await saveRemoteProtocol(submitted);
      setProtocol(submitted); saveProtocol(submitted); setSyncStatus("saved");
      await onProtocolChanged?.("submitted");
    } catch (error) {
      alert("Nie udało się przekazać protokołu: " + (error instanceof Error ? error.message : String(error)));
    }
  };
  const reopenProtocol = async () => {
    if (!canApprove) return;
    if (!confirm("Cofnąć zatwierdzenie i ponownie otworzyć protokół? Wynik oraz automatyczne zawieszenia z tego protokołu zostaną wycofane.")) return;
    try {
      if (localOnly) { const reopened = { ...protocol, status: protocol.events.length ? "live" as const : "setup" as const, finishedAt: "", closedAt: undefined, closedBy: undefined, approvedAt: undefined, approvedBy: undefined, updatedAt: new Date().toISOString() }; setProtocol(reopened); onLocalProtocolChange?.(reopened); await onProtocolChanged?.(reopened.status); return; }
      const reopened = await reopenRemoteMatchProtocol(match.id);
      setProtocol(reopened);
      await onProtocolChanged?.(reopened.status);
    } catch (error) {
      alert("Nie udało się ponownie otworzyć protokołu: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const shootoutEvents = (side: ProtocolTeam) => protocol.events.filter(event => event.period === "PS" && event.team === side && ["shootout_goal", "shootout_miss"].includes(event.kind));
  const shootoutComplete = (() => {
    const home = shootoutEvents("home"), away = shootoutEvents("away");
    const homeGoals = home.filter(e => e.kind === "shootout_goal").length, awayGoals = away.filter(e => e.kind === "shootout_goal").length;
    if (home.length <= 5 && away.length <= 5) {
      if (homeGoals > awayGoals + Math.max(0, 5 - away.length)) return true;
      if (awayGoals > homeGoals + Math.max(0, 5 - home.length)) return true;
    }
    return home.length >= 5 && away.length >= 5 && home.length === away.length && homeGoals !== awayGoals;
  })();
  const addShootout = (scored: boolean) => {
    if (shootoutComplete) return alert("Seria rzutów karnych jest już rozstrzygnięta.");
    if (!shootoutFirstTeam) return alert("Najpierw wybierz drużynę, która rozpoczyna serię po rzucie monetą.");
    const sideEvents = shootoutEvents(activeShootoutTeam);
    const automaticId = sideEvents.length >= 5 ? sideEvents[sideEvents.length % 5]?.playerId || "" : "";
    const selectedId = automaticId || shootoutPlayerId;
    if (!selectedId) return alert("Wybierz strzelca rzutu karnego.");
    if (sideEvents.length < 5 && sideEvents.some(event => event.playerId === selectedId)) return alert("W pierwszej piątce każdy zawodnik może wykonywać rzut karny tylko raz.");
    const event: ProtocolEvent = { id: crypto.randomUUID(), period: "PS", clock: `K${sideEvents.length + 1}`, team: activeShootoutTeam, playerId: selectedId, kind: scored ? "shootout_goal" : "shootout_miss", createdAt: new Date().toISOString() };
    setProtocol(p => ({ ...p, events: [...p.events, event] })); setShootoutPlayerId("");
  };

  const updatePlayer = (side: ProtocolTeam, slot: number, value: string) => setProtocol(p => {
    const key = side === "home" ? "homePlayers" : "awayPlayers";
    const existing = p[key].find(player => player.slot === slot);
    const player: ProtocolPlayer = existing || { id: `manual-${side}-${slot}`, slot, capNumber: slot, name: "", isGoalkeeper: false, isCaptain: false };
    const updated = { ...player, name: value, capNumber: slot };
    return { ...p, [key]: [...p[key].filter(item => item.slot !== slot), updated].sort((a, b) => a.slot - b.slot) };
  });
  const setPlayerRole = (side: ProtocolTeam, playerId: string, role: "isGoalkeeper" | "isCaptain", checked: boolean) => {
    const key = side === "home" ? "homePlayers" : "awayPlayers";
    setProtocol(p => {
      const roster = p[key];
      if (role === "isGoalkeeper" && checked && roster.filter(player => player.isGoalkeeper).length >= 2) {
        alert("W jednej drużynie można wskazać maksymalnie dwóch bramkarzy.");
        return p;
      }
      return { ...p, [key]: roster.map(player => player.id === playerId ? { ...player, [role]: checked } : role === "isCaptain" && checked ? { ...player, isCaptain: false } : player) };
    });
  };
  const movePlayer = (side: ProtocolTeam, slot: number, direction: -1 | 1) => setProtocol(p => {
    const key = side === "home" ? "homePlayers" : "awayPlayers";
    const targetSlot = slot + direction;
    if (targetSlot < 1 || targetSlot > 15) return p;
    const current = p[key].find(player => player.slot === slot);
    if (!current) return p;
    const target = p[key].find(player => player.slot === targetSlot);
    const unchanged = p[key].filter(player => player.slot !== slot && player.slot !== targetSlot);
    const moved = { ...current, slot: targetSlot, capNumber: targetSlot };
    const swapped = target ? { ...target, slot, capNumber: slot } : null;
    return { ...p, [key]: [...unchanged, moved, ...(swapped ? [swapped] : [])].sort((a, b) => a.slot - b.slot) };
  });

  const importOfflineProtocol = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!confirm("Zaimportowany plik zastąpi aktualną wersję protokołu tego meczu. Kontynuować?")) return;
    try {
      const imported = await importProtocolFile(file, match.id);
      setProtocol({ ...imported, homePlayers: fixedCapNumbers(imported.homePlayers), awayPlayers: fixedCapNumbers(imported.awayPlayers) });
      setSyncStatus(navigator.onLine ? "syncing" : "offline");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nie udało się odczytać pliku protokołu.");
    }
  };

  const syncLabel = localOnly ? "DEMO — zapis wyłącznie na tym urządzeniu" : syncStatus === "loading" ? "Pobieranie wersji" : syncStatus === "syncing" ? "Synchronizacja" : syncStatus === "saved" ? "Zapisano na urządzeniu i serwerze" : syncStatus === "offline" ? "Offline - zapisano na urządzeniu" : "Zapisano na urządzeniu - serwer niedostępny";

  const timeoutBoxes = (side: ProtocolTeam) => <div className="flex items-center gap-2 text-sm"><b>Time-out:</b>{[0,1].map(i => <span key={i} className={`grid h-7 w-7 place-items-center rounded border-2 font-black ${timeouts(side) > i ? "border-red-400 bg-red-50 text-red-600" : "border-slate-300 text-transparent"}`}>×</span>)}</div>;
  const teamCard = (side: ProtocolTeam, title: string, roster: typeof homePlayers) => <section className={`rounded-xl border ${side === "away" ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}`}>
    <div className="border-b p-3"><b>{title}</b><div className="mt-2 grid gap-2 sm:grid-cols-3"><input disabled={!setup} className={input} placeholder="Trener" value={side === "home" ? protocol.homeCoach : protocol.awayCoach} onChange={e => setProtocol(p => ({ ...p, [side === "home" ? "homeCoach" : "awayCoach"]: e.target.value }))}/><input disabled={!setup} className={input} placeholder="Oficjel 1" value={side === "home" ? protocol.homeOfficial1 : protocol.awayOfficial1} onChange={e => setProtocol(p => ({ ...p, [side === "home" ? "homeOfficial1" : "awayOfficial1"]: e.target.value }))}/><input disabled={!setup} className={input} placeholder="Oficjel 2" value={side === "home" ? protocol.homeOfficial2 : protocol.awayOfficial2} onChange={e => setProtocol(p => ({ ...p, [side === "home" ? "homeOfficial2" : "awayOfficial2"]: e.target.value }))}/></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead><tr><th className="p-2 text-left">Czepek</th><th className="p-2 text-left">Zawodnik</th>{setup?<><th className="p-2 text-center">GK</th><th className="p-2 text-center">C</th></>:null}<th className="p-2">Bramki</th><th className="p-2" colSpan={3}>Przewinienia główne</th></tr></thead><tbody>{Array.from({length:15},(_,i)=>{const slot=i+1,player=roster.find(p=>p.slot===slot), goals=player?playerGoals(protocol.events,player.id):0, foulEvents=player?playerMajorFoulEvents(protocol.events,player.id):[];return <tr key={i} className={`border-t ${foulEvents.length>=3?"bg-red-50":""}`}><td className="w-20 p-2 font-bold"><span className="inline-grid h-7 w-12 place-items-center rounded-full border border-slate-300 bg-slate-50">{slot}</span></td><td className="p-2">{setup?<div className="flex items-center gap-1"><input className="min-w-0 flex-1 rounded border px-2 py-1" placeholder="Imię i nazwisko" value={player?.name||""} onChange={e=>updatePlayer(side,slot,e.target.value)}/><button type="button" disabled={!player||slot===1} onClick={()=>movePlayer(side,slot,-1)} title="Przesuń zawodnika wyżej" className="rounded border p-1 disabled:opacity-25"><ChevronUp className="h-3.5 w-3.5"/></button><button type="button" disabled={!player||slot===15} onClick={()=>movePlayer(side,slot,1)} title="Przesuń zawodnika niżej" className="rounded border p-1 disabled:opacity-25"><ChevronDown className="h-3.5 w-3.5"/></button></div>:<>{player?.name||"—"}{player?.isCaptain?" (C)":""}{player?.isGoalkeeper?" (GK)":""}{foulEvents.length>=3?<span className="ml-2 font-bold text-red-600">WYKLUCZONY</span>:""}</>}</td>{setup?<><td className="p-2 text-center">{player?.name?<input aria-label={`Bramkarz ${player.name}`} type="checkbox" checked={player.isGoalkeeper} onChange={e=>setPlayerRole(side,player.id,"isGoalkeeper",e.target.checked)}/>:null}</td><td className="p-2 text-center">{player?.name?<input aria-label={`Kapitan ${player.name}`} type="checkbox" checked={player.isCaptain} onChange={e=>setPlayerRole(side,player.id,"isCaptain",e.target.checked)}/>:null}</td></>:null}<td className="p-2 text-center"><button disabled={!goals} onMouseEnter={()=>player&&setHighlightPlayer(player.id)} onMouseLeave={()=>setHighlightPlayer(null)} className={goals?"rounded bg-amber-100 px-2 py-1 font-bold text-amber-800":""}>{goals||"—"}</button></td>{[0,1,2].map(n=>{const foul=foulEvents[n],danger=foul&&(n===2||["exclusion_substitution","brutality"].includes(foul.kind));return <td key={n} className="w-10 p-2 text-center">{foul?<button onMouseEnter={()=>player&&setHighlightFoulPlayer(player.id)} onMouseLeave={()=>setHighlightFoulPlayer(null)} className={`rounded px-1.5 py-1 font-black ${danger?"bg-red-600 text-white":"bg-slate-200 text-slate-800"}`}>{eventSymbol(foul.kind)||"W"}</button>:""}</td>})}</tr>})}</tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">{timeoutBoxes(side)}{live && protocol.currentPeriod!=="PS" ? <button onClick={()=>openNew(side)} className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-semibold shadow-sm ${side==="home"?"border-slate-400 bg-white text-[#061a33]":"border-[#061a33] bg-[#061a33] text-white"}`}><Plus className="h-4 w-4"/>Dodaj wydarzenie</button>:null}</div>
  </section>;

  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/60 p-2 sm:p-5"><div className="mx-auto min-h-full max-w-7xl rounded-2xl bg-slate-50 shadow-2xl">
    <header className="sticky top-0 z-10 flex justify-between gap-3 rounded-t-2xl border-b bg-white p-4"><div><div className="text-xs font-bold uppercase tracking-widest text-amber-600">Elektroniczny protokół meczu</div><h2 className="text-xl font-bold">Protokół: {match.home} — {match.away}</h2><p className="text-sm text-slate-600">{match.date} • {match.location} • Sędziowie: {[protocol.referee1,protocol.referee2].filter(Boolean).join(", ")||"—"} • Delegat: {protocol.delegateName||"—"}</p><div className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${syncStatus === "saved" ? "bg-green-50 text-green-700" : syncStatus === "offline" || syncStatus === "error" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-700"}`}>{syncStatus === "offline" || syncStatus === "error" ? <CloudOff className="h-3.5 w-3.5"/> : <Cloud className="h-3.5 w-3.5"/>}{syncLabel}{lastSavedAt ? ` • ${new Date(lastSavedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</div></div><button onClick={onClose} className="rounded-lg border p-2"><X/></button></header>
    <main className="space-y-4 p-3 sm:p-5">{loading?<div className="rounded-xl bg-white p-4">Pobieranie składów…</div>:null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><div><small className="uppercase text-slate-500">Status protokołu</small><div className="text-xl font-bold">{setup?"Przygotowanie":live?periodLabel(protocol.currentPeriod):protocol.status==="submitted"?"Oczekuje na zatwierdzenie":"Zatwierdzony"}</div></div><div className="rounded-xl bg-[#061a33] px-4 py-2 text-xl font-bold text-white">{score.home} : {score.away}</div></div>
      <section className="rounded-xl border bg-white p-3"><h3 className="font-bold">Obsada stolika i meczu</h3><div className="mt-3 grid gap-2 md:grid-cols-3"><input disabled={!setup} className={input} placeholder="Arbiter I" value={protocol.referee1} onChange={e=>setProtocol(p=>({...p,referee1:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Arbiter II" value={protocol.referee2} onChange={e=>setProtocol(p=>({...p,referee2:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Delegat" value={protocol.delegateName} onChange={e=>setProtocol(p=>({...p,delegateName:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Protokolant (opcjonalnie)" value={protocol.protocolSecretary} onChange={e=>setProtocol(p=>({...p,protocolSecretary:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Sędzia czasu I (opcjonalnie)" value={protocol.timeSecretary1} onChange={e=>setProtocol(p=>({...p,timeSecretary1:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Sędzia czasu II (opcjonalnie)" value={protocol.timeSecretary2} onChange={e=>setProtocol(p=>({...p,timeSecretary2:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Sędzia bramkowy I (opcjonalnie)" value={protocol.goalSecretary1} onChange={e=>setProtocol(p=>({...p,goalSecretary1:e.target.value}))}/><input disabled={!setup} className={input} placeholder="Sędzia bramkowy II (opcjonalnie)" value={protocol.goalSecretary2} onChange={e=>setProtocol(p=>({...p,goalSecretary2:e.target.value}))}/></div></section>
      <div className="grid gap-3 lg:grid-cols-2">{teamCard("home",match.home,homePlayers)}{teamCard("away",match.away,awayPlayers)}</div>
      <div className="flex flex-wrap justify-center gap-3 rounded-xl border bg-white p-3">{setup?<button onClick={startMatch} className="rounded-xl bg-green-600 px-8 py-3 text-lg font-black text-white">{protocol.events.length?"Wznów edycję protokołu":"Rozpocznij mecz"}</button>:live?<><button onClick={undoQuarter} className="rounded-xl border px-6 py-3 font-bold">{protocol.currentPeriod===1?"Cofnij rozpoczęcie meczu":"Cofnij koniec kwarty"}</button>{protocol.currentPeriod!=="PS"?<button onClick={endQuarter} className="rounded-xl border border-amber-300 bg-amber-50 px-8 py-3 text-lg font-bold text-amber-800">Koniec kwarty</button>:null}</>:null}</div>
      {live&&protocol.currentPeriod==="PS"?<section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Seria rzutów karnych</h3><p className="text-sm text-slate-600">Przed pierwszym rzutem wybierz wynik losowania. Pierwszych pięciu strzelców każdej drużyny wybierasz ręcznie, bez powtórzeń.</p></div><div className="rounded-lg bg-white px-4 py-2 font-black">Karne: {shootoutEvents("home").filter(e=>e.kind==="shootout_goal").length} : {shootoutEvents("away").filter(e=>e.kind==="shootout_goal").length}</div></div>{!recordedShootoutEvents.length?<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-white p-3"><b className="mr-2">Kto rozpoczyna po rzucie monetą?</b><button onClick={()=>{setProtocol(p=>({...p,shootoutFirstTeam:"home"}));setShootoutTeam("home");setShootoutPlayerId("")}} className={`rounded-lg border-2 px-4 py-2 font-bold ${shootoutFirstTeam==="home"?"border-slate-600 bg-slate-200":"border-slate-300 bg-white"}`}>Jasne</button><button onClick={()=>{setProtocol(p=>({...p,shootoutFirstTeam:"away"}));setShootoutTeam("away");setShootoutPlayerId("")}} className={`rounded-lg border-2 px-4 py-2 font-bold ${shootoutFirstTeam==="away"?"border-sky-700 bg-sky-600 text-white":"border-sky-300 bg-sky-100 text-sky-950"}`}>Ciemne</button></div>:null}<div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_auto_auto]"><div className={`rounded-lg border-2 px-4 py-2 text-center font-black ${activeShootoutTeam==="home"?"border-slate-500 bg-slate-200 text-[#061a33]":"border-sky-700 bg-sky-600 text-white"}`}>Teraz: {activeShootoutTeam==="home"?"Jasne":"Ciemne"}</div>{automaticShootoutPlayerId?<div className="rounded-lg border bg-white px-3 py-2 font-bold">Automatycznie: #{selectedShootoutPlayers.find(p=>p.id===automaticShootoutPlayerId)?.capNumber} {selectedShootoutPlayers.find(p=>p.id===automaticShootoutPlayerId)?.name}</div>:<select disabled={!shootoutFirstTeam} className={input} value={shootoutPlayerId} onChange={e=>setShootoutPlayerId(e.target.value)}><option value="">{shootoutFirstTeam?`Wybierz strzelca nr ${selectedShootoutEvents.length+1}`:"Najpierw wybierz drużynę rozpoczynającą"}</option>{selectedShootoutPlayers.filter(p=>p.name&&!selectedFirstFiveShootoutPlayerIds.has(p.id)).map(p=><option key={p.id} value={p.id}>#{p.capNumber} {p.name}</option>)}</select>}<button disabled={!shootoutFirstTeam} onClick={()=>addShootout(true)} className="rounded-lg bg-green-600 px-5 py-2 font-black text-white disabled:opacity-40">G · Gol</button><button disabled={!shootoutFirstTeam} onClick={()=>addShootout(false)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-black text-white disabled:opacity-40"><ShootoutMissMark/> Pudło</button></div>{shootoutComplete?<div className="mt-3 rounded-lg bg-green-100 p-3 text-center font-black text-green-800">Seria rzutów karnych rozstrzygnięta.</div>:null}</section>:null}
      {live&&protocol.currentPeriod==="PS"&&shootoutComplete?<div role="status" className="rounded-2xl border-4 border-green-600 bg-green-100 p-5 text-center"><div className="text-3xl font-black uppercase text-green-800">Koniec meczu</div><p className="mt-1 font-bold text-green-800">Jedna z drużyn nie może już odrobić wyniku w serii rzutów karnych.</p></div>:null}
      {editorOpen?<div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/60 p-3"><section className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl"><div className="flex justify-between"><div><small className="font-bold uppercase text-sky-600">{team==="home"?match.home:match.away}</small><h3 className="text-xl font-bold">{editingId?"Edytuj wydarzenie":"Dodaj wydarzenie"}</h3></div><button onClick={()=>setEditorOpen(false)} className="rounded-lg border p-2"><X/></button></div>
        <div className="mt-4 grid grid-cols-3 gap-2" onMouseEnter={cancelMenuClose} onMouseLeave={scheduleMenuClose}><button onMouseEnter={()=>setEventMenu(null)} onClick={()=>selectKind("goal")} className={`rounded-xl border p-3 font-bold ${kind==="goal"?"border-green-500 bg-green-50 text-green-700":""}`}>G · Gol</button>{(["foul","other"] as const).map(group=><div key={group} className="relative"><button onClick={()=>setEventMenu(eventMenu===group?null:group)} className={`w-full rounded-xl border p-3 text-center font-bold ${selectedOption.group===group?"border-sky-500 bg-sky-50 text-sky-700":""}`}>{group==="foul"?"Przewinienie":"Inne"}</button>{eventMenu===group?<div className={`absolute top-full z-10 mt-1 w-72 rounded-xl border bg-white p-2 shadow-xl ${group==="other"?"right-0":"left-0"}`}>{PROTOCOL_EVENT_OPTIONS.filter(o=>o.group===group&&!o.value.startsWith("shootout_")).map(o=><button key={o.value} onClick={()=>selectKind(o.value)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"><b>{o.symbol||"—"}</b> · {o.label}</button>)}</div>:null}</div>)}</div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 font-semibold">{eventSymbol(kind)?`${eventSymbol(kind)} · `:""}{selectedOption.label}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Czas<input autoFocus inputMode="numeric" className={`${input} mt-1`} placeholder="627 → 06:27" value={clock} onChange={e=>setClock(e.target.value)} onBlur={()=>setClock(normalizeProtocolClock(clock))}/></label>{!["timeout","official_penalty"].includes(kind)?<label className="text-sm font-semibold">{cardTarget?"Osoba ukarana":"Zawodnik"}<select className={`${input} mt-1`} value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">{cardTarget?"Wybierz zawodnika, trenera lub oficjela":"Wybierz numer czepka"}</option>{players.filter(p=>p.id===playerId||!playerIsOut(p.id,editingId)).map(p=><option key={p.id} value={p.id}>#{p.capNumber} {p.name}</option>)}{staffOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>:null}</div><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setEditorOpen(false)} className="rounded-lg border px-4 py-2">Anuluj</button><button onClick={saveEvent} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 font-bold text-white"><Check className="h-4 w-4"/>{editingId?"Zapisz zmianę":"Dodaj"}</button></div>
      </section></div>:null}
      {thirdFoulPlayer?<div className="fixed inset-0 z-[160] grid place-items-center bg-red-950/80 p-4"><section role="alertdialog" className="w-full max-w-xl rounded-2xl border-4 border-red-600 bg-white p-7 text-center shadow-2xl"><div className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Zawodnik nie może dalej uczestniczyć w meczu</div><h3 className="mt-3 text-4xl font-black text-red-700">3. PRZEWINIENIE GŁÓWNE</h3><p className="mt-4 text-xl font-bold">#{thirdFoulPlayer.capNumber} {thirdFoulPlayer.name}</p><button autoFocus onClick={()=>setThirdFoulPlayer(null)} className="mt-6 rounded-xl bg-red-600 px-8 py-3 text-lg font-black uppercase text-white">Potwierdzam</button></section></div>:null}
      <section className="rounded-2xl border bg-white"><h3 className="border-b p-3 text-lg font-bold">Przebieg gry</h3><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="bg-slate-50 text-left">{["Lp.","Kwarta","Czas","Drużyna","Zawodnik / oficjel","Symbol","Wynik","Akcje"].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{setup&&!protocol.events.length?<tr><td colSpan={8} className="p-5 text-center text-slate-500">Przebieg gry będzie dostępny po rozpoczęciu meczu.</td></tr>:visiblePeriods.map(period=>{const periodEvents=protocol.events.filter(event=>event.period===period);return <React.Fragment key={period}><tr><td colSpan={8} className="border-y border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 text-center font-black uppercase tracking-[0.14em] text-amber-900">{periodLabel(period)}</td></tr>{periodEvents.length?periodEvents.map(event=>{const index=protocol.events.indexOf(event),roster=event.team==="home"?homePlayers:awayPlayers,running=protocolScore(protocol.events.slice(0,index+1)),goalHit=highlightPlayer&&event.kind==="goal"&&event.playerId===highlightPlayer,foulHit=highlightFoulPlayer&&["exclusion","penalty","exclusion_substitution","brutality","double_exclusion"].includes(event.kind)&&event.playerId===highlightFoulPlayer,isHovered=hoveredEventId===event.id,rowTone=isHovered?(event.team==="home"?"bg-slate-200 text-[#061a33]":"bg-sky-500 text-white"):(event.team==="home"?"bg-white text-[#061a33]":"bg-sky-100 text-[#061a33]");return <React.Fragment key={event.id}><tr onMouseEnter={()=>setHoveredEventId(event.id)} onMouseLeave={()=>setHoveredEventId(null)} style={isHovered&&!goalHit&&!foulHit?{backgroundColor:event.team==="home"?"#e2e8f0":"#0ea5e9",color:event.team==="home"?"#061a33":"#ffffff"}:undefined} className={`border-t transition-colors ${goalHit?"bg-amber-200 text-[#061a33]":foulHit?"bg-red-200 text-[#061a33]":rowTone}`}><td className="p-2">{index+1}</td><td className="p-2 font-bold">{event.period}</td><td className="p-2 tabular-nums">{event.period==="PS"?"—":event.clock}</td><td className="p-2">{event.team==="home"?match.home:match.away}</td><td className="p-2">{participantLabel(event,roster)}</td><td title={eventLabel(event.kind)} className="p-2 font-bold">{event.kind==="shootout_miss"?<ShootoutMissMark/>:eventSymbol(event.kind)||"W (obie)"}</td><td className="p-2 font-bold">{running.home}:{running.away}</td><td className="p-2">{live?<div className="flex gap-2"><button onClick={()=>openEdit(event)} className={isHovered&&event.team==="away"?"text-white":"text-sky-600"}><Pencil className="h-4 w-4"/></button><button onClick={()=>removeEvent(event)} className={isHovered&&event.team==="away"?"text-red-100":"text-red-600"}><Trash2 className="h-4 w-4"/></button></div>:null}</td></tr>{requiresDisciplinaryDecision(event.kind)&&live?<tr className="bg-red-50"><td colSpan={8} className="p-3"><div className="grid gap-2 md:grid-cols-[1fr_auto]"><textarea className={input} placeholder="Uwagi sędziego — wymagane przed zamknięciem" value={event.reason||""} onChange={e=>setDecision(event.id,"reason",e.target.value)}/><div className="rounded-lg border bg-white p-2 text-sm"><b>Rażące zachowanie?</b><label className="ml-3"><input type="radio" name={`g-${event.id}`} checked={event.grossUnsporting===true} onChange={()=>setDecision(event.id,"grossUnsporting",true)}/> Tak</label><label className="ml-3"><input type="radio" name={`g-${event.id}`} checked={event.grossUnsporting===false} onChange={()=>setDecision(event.id,"grossUnsporting",false)}/> Nie</label></div></div></td></tr>:null}</React.Fragment>}):<tr><td colSpan={8} className="bg-slate-50 px-4 py-3 text-center text-sm italic text-slate-500">Brak wydarzeń w tej kwarcie.</td></tr>}</React.Fragment>})}</tbody></table></div></section>
      <section className="grid gap-3 rounded-2xl border bg-white p-3 md:grid-cols-2"><label className="text-sm font-bold">Pozostałe uwagi sędziowskie<textarea disabled={!live} className={`${input} mt-1 min-h-28`} value={protocol.refereeNotes} onChange={e=>setProtocol(p=>({...p,refereeNotes:e.target.value}))}/></label><div className="space-y-3"><label className="block text-sm font-bold">Godzina zakończenia<input disabled={!live} type="time" className={`${input} mt-1`} value={protocol.finishedAt} onChange={e=>setProtocol(p=>({...p,finishedAt:e.target.value}))}/></label><label><input disabled={!live} type="checkbox" checked={protocol.protest} onChange={e=>setProtocol(p=>({...p,protest:e.target.checked}))}/> Protest</label></div></section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-black text-amber-900">MVP meczu</h3><p className="mt-1 text-sm text-slate-600">Przed przekazaniem protokołu wybierz po jednym zawodniku z każdej drużyny.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-bold">MVP — {match.home}<select disabled={!live} className={`${input} mt-1`} value={protocol.homeMvpPlayerId} onChange={e=>setProtocol(p=>({...p,homeMvpPlayerId:e.target.value}))}><option value="">Wybierz zawodnika</option>{homePlayers.filter(player=>player.name).map(player=><option key={player.id} value={player.id}>#{player.capNumber} {player.name}{player.isGoalkeeper?" (BR)":""}</option>)}</select></label><label className="text-sm font-bold">MVP — {match.away}<select disabled={!live} className={`${input} mt-1`} value={protocol.awayMvpPlayerId} onChange={e=>setProtocol(p=>({...p,awayMvpPlayerId:e.target.value}))}><option value="">Wybierz zawodnika</option>{awayPlayers.filter(player=>player.name).map(player=><option key={player.id} value={player.id}>#{player.capNumber} {player.name}{player.isGoalkeeper?" (BR)":""}</option>)}</select></label></div></section>
      <div className="flex flex-wrap justify-end gap-2 pb-3"><button onClick={()=>void syncProtocol({ ...protocol, updatedAt: new Date().toISOString() })} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold"><Save className="h-4 w-4"/>Zapisz teraz</button><button onClick={()=>exportProtocolFile({ ...protocol, updatedAt: new Date().toISOString() })} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold"><Download className="h-4 w-4"/>Eksport offline</button><button onClick={()=>importRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold"><Upload className="h-4 w-4"/>Import offline</button><input ref={importRef} type="file" accept=".json,.wpolo.json,application/json" className="hidden" onChange={event=>void importOfflineProtocol(event)}/>{live?<button onClick={submitProtocol} disabled={!canSubmit} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-bold text-white disabled:opacity-40"><FileCheck2 className="h-4 w-4"/>Zamknij i przekaż delegatowi</button>:null}{protocol.status==="submitted"&&canApprove?<><button onClick={reopenProtocol} className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 font-bold text-amber-800">Edytuj protokół</button><span className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">Zatwierdzenie dostępne przy meczu</span></>:null}{protocol.status==="approved"&&canApprove?<button onClick={reopenProtocol} className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 font-bold text-amber-800">Edytuj zatwierdzony protokół</button>:null}{protocol.status==="approved"?<button onClick={()=>context&&void generateMatchProtocolPdf(match,protocol,homePlayers,awayPlayers)} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 font-bold text-white"><FileDown className="h-4 w-4"/>Pobierz PDF</button>:null}</div>
    </main></div></div>;
}
