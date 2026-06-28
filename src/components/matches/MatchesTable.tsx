import React, { useMemo, useState } from "react";
import { Check, Image, RefreshCw, Search, Table, X } from "lucide-react";
import { setMyAvailability } from "../../lib/availability";
import { Section } from "../shared/Section";
import { DocBadge } from "../shared/DocBadge";
import { AdminAvailableReferees } from "./AdminAvailableReferees";
import { PerMatchActions } from "./PerMatchActions";
import type { AppState, Match, Role } from "../../types/wpolo";

type PenaltyBucket = { home: { id: string; name: string }[]; away: { id: string; name: string }[] };

type MatchesTableProps = {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  user: { name: string; role: Role; club?: string } | null;
  onRefresh: () => void;
  loading: boolean;
  penaltyMap: Map<string, PenaltyBucket>;
  onRemovePenalty: (id: string) => void;
  title?: string;
  sectionClassName?: string;
  variant: "upcoming" | "finished";
  showExport?: boolean;
  onQuickEdit?: (matchId: string) => void;
  clubs: readonly string[];
  refereeNames: string[];
  delegateNames: string[];
  editingMatchId?: string | null;
  onCancelEdit?: () => void;
  removeWholeSlot: (
    kind: "comms" | "roster" | "report" | "photos",
    matchId: string,
    clubOrNeutral: string,
    path?: string
  ) => Promise<void>;
  renderExportImport?: (args: {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
  }) => React.ReactNode;
  renderAdminPanel?: (match: Match) => React.ReactNode;
};

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const classes = {
  input: "w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow",
  btnOutline: "px-3 py-2 rounded-xl border border-amber-600 text-amber-700 bg-white hover:bg-amber-50",
  btnSecondary: "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50",
  iconBtn: "p-2 rounded-lg border bg-white hover:bg-gray-50",
  pill: "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white",
};

const normKey = (s?: string) =>
  (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

function sanitizeUrl(u?: string | null) {
  const s = (u || "").trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return null;
  } catch {
    if (/^([a-z0-9-]+\.)+[a-z]{2,}/i.test(s)) return `https://${s}`;
    return null;
  }
}

type BaseRole = "Guest" | "Admin" | "Club" | "Delegate" | "Referee" | "Editor";

function roleTokens(role?: string): BaseRole[] {
  const r = (role || "Guest").toString().trim();
  if (r === "Admin") return ["Admin", "Club", "Delegate", "Referee"];
  return r.split(/[-+,\s]+/).map(s => s.trim()).filter(Boolean) as BaseRole[];
}

function hasRole(user: { role?: string | Role } | null | undefined, target: BaseRole) {
  if (!user?.role) return target === "Guest";
  const toks = roleTokens(String(user.role));
  return toks.includes(target);
}

function isAdmin(u: { role: Role }) {
  return hasRole(u, "Admin");
}

function isDelegate(u: { role: Role }) {
  return hasRole(u, "Delegate") || isAdmin(u);
}

export const MatchesTable: React.FC<MatchesTableProps> = ({
  state,
  setState,
  user,
  onRefresh,
  loading,
  penaltyMap,
  onRemovePenalty,
  title,
  sectionClassName,
  variant,
  showExport = false,
  onQuickEdit,
  clubs,
  refereeNames,
  delegateNames,
  editingMatchId,
  onCancelEdit,
  removeWholeSlot,
  renderExportImport,
  renderAdminPanel,
}) => {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "seriesRound">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [openActionsMatchId, setOpenActionsMatchId] = useState<string | null>(null);
  const activeEditorRef = React.useRef<HTMLDivElement>(null);
  const cardBg = variant === "upcoming" ? "bg-white" : "bg-white/90";
  const rowStriping = "";

  const sorted = useMemo(() => {
    const arr = [...state.matches];

    arr.sort((a, b) => {
      const as = (a.seriesRound ?? "").toString().trim();
      const bs = (b.seriesRound ?? "").toString().trim();

      const parseNum = (v: string) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
      };

      if (sortKey === "seriesRound") {
        const na = parseNum(as);
        const nb = parseNum(bs);

        if (na !== null && nb !== null && na !== nb) {
          return sortDir === "asc" ? na - nb : nb - na;
        }
        if (as !== bs) {
          return sortDir === "asc" ? as.localeCompare(bs, "pl") : bs.localeCompare(as, "pl");
        }

        const ma = parseNum(String(a.round ?? ""));
        const mb = parseNum(String(b.round ?? ""));
        if (ma !== null && mb !== null && ma !== mb) return ma - mb;

        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return da - db;
      }

      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return sortDir === "asc" ? da - db : db - da;

      const ma = parseNum(String(a.round ?? ""));
      const mb = parseNum(String(b.round ?? ""));
      return (ma ?? 0) - (mb ?? 0);
    });

    return arr;
  }, [state.matches, sortKey, sortDir]);

  const filtered = useMemo(
    () =>
      sorted.filter(m =>
        [m.home, m.away, m.location, m.round, m.result, m.delegate, ...m.referees]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      ),
    [sorted, q]
  );

  const groupedByRound = useMemo(() => {
    const groups: Record<string, Match[]> = {};

    for (const m of filtered) {
      const key = (m.seriesRound ?? "").toString().trim() || "—";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }

    const sortedRounds = Object.keys(groups).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      const aNum = Number.isFinite(na);
      const bNum = Number.isFinite(nb);
      if (aNum && bNum) return na - nb;
      if (aNum !== bNum) return aNum ? -1 : 1;
      return a.localeCompare(b, "pl");
    });

    return { groups, sortedRounds };
  }, [filtered]);

  const formatDate = (iso: string) =>
    new Date(iso)
      .toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "2-digit" })
      .replace(/\./g, "-");

  const isGuest = !user || hasRole(user, "Guest");
  const canDownload = !!user && !isGuest;
  const isUserReferee = !!user && user.role === "Referee";
  const isUserAdmin = !!user && isAdmin(user);

  function renderResult(m: Match) {
    const r = (m.result || "").trim();
    if (!r) return "-";
    if (!m.shootout) return r;

    const [aStr, bStr] = r.split(":");
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a > b) return `k${a}:${b}`;
      if (b > a) return `${a}:${b}k`;
    }
    return r;
  }

  return (
    <Section title={title} icon={<Table className="w-5 h-5" />} className={sectionClassName}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className={clsx(classes.input, "pl-9")}
            placeholder="Szukaj po drużynie, miejscu, sędziach..."
          />
        </div>

        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as "date" | "seriesRound")}
          className={classes.input}
          style={{ maxWidth: 170 }}
          title="Sortuj wg…"
        >
          <option value="date">Sortuj wg daty</option>
          <option value="seriesRound">Sortuj wg rundy</option>
        </select>

        <button
          onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
          className={clsx(classes.btnSecondary, "px-2")}
          title={sortDir === "asc" ? "Kierunek: rosnąco" : "Kierunek: malejąco"}
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </button>

        <button onClick={onRefresh} className={clsx(classes.btnSecondary, "flex items-center gap-2")}>
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          Odśwież
        </button>

        {showExport && user && user.role !== "Guest" && renderExportImport?.({ state, setState })}
      </div>

      {filtered.length === 0 && <div className="text-sm text-gray-600">Brak meczów do wyświetlenia.</div>}

      <div className="md:hidden space-y-4">
        {groupedByRound.sortedRounds.map(runda => (
          <div key={runda} className="rounded-xl border-2 border-amber-400 overflow-hidden bg-white">
            <div className="bg-amber-50 text-amber-800 font-semibold text-center py-1">Runda {runda}</div>

            <div className="p-3 space-y-3">
              {groupedByRound.groups[runda].map(m => {
                const homePens = penaltyMap.get(m.id)?.home || [];
                const awayPens = penaltyMap.get(m.id)?.away || [];
                const streamHref = sanitizeUrl(m.streamUrl);
                const isEditingThisMatch = editingMatchId === m.id;

                return (
                  <div
                    key={m.id}
                    className={clsx(
                      "rounded-xl border p-3 shadow-sm transition-colors",
                      cardBg,
                      isEditingThisMatch && "border-amber-400 bg-amber-50/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 truncate">
                          {formatDate(m.date)}{m.time ? ` ${m.time}` : ""} • {m.location}
                        </div>
                        <div className="font-medium break-words">{m.home} vs {m.away}</div>

                        <div className="text-xs text-gray-600 break-words">
                          Sędziowie: {m.referees.filter(Boolean).join(", ") || "–"}
                          {m.delegate ? ` • Delegat: ${m.delegate}` : ""}
                          {user && isAdmin(user) && onQuickEdit && (
                            <button
                              className="ml-2 underline text-blue-700"
                              onClick={() => onQuickEdit(m.id)}
                              title="Szybka edycja w panelu admina"
                            >
                              Edytuj
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-sm font-semibold shrink-0">{renderResult(m)}</div>
                    </div>

                    {user && isAdmin(user) && isEditingThisMatch && renderAdminPanel && (
                      <div ref={activeEditorRef} className="mt-3">
                        {renderAdminPanel(m)}
                      </div>
                    )}

                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <div className="text-xs">
                        <span className="font-semibold">Kary (Gospodarz): </span>
                        {isGuest ? (
                          <span className="text-gray-500">–</span>
                        ) : homePens.length === 0 ? (
                          <span className="text-gray-500">–</span>
                        ) : (
                          <span className="inline-flex flex-wrap gap-1 align-top">
                            {homePens.map(p => (
                              <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                                {p.name}
                                {user && (isAdmin(user) || isDelegate(user)) && (
                                  <button
                                    onClick={() => onRemovePenalty(p.id)}
                                    className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                                    title="Usuń karę"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>

                      <div className="text-xs">
                        <span className="font-semibold">Kary (Goście): </span>
                        {isGuest ? (
                          <span className="text-gray-500">–</span>
                        ) : awayPens.length === 0 ? (
                          <span className="text-gray-500">–</span>
                        ) : (
                          <span className="inline-flex flex-wrap gap-1 align-top">
                            {awayPens.map(p => (
                              <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                                {p.name}
                                {user && (isAdmin(user) || m.delegate === user.name) && (
                                  <button
                                    onClick={() => onRemovePenalty(p.id)}
                                    className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                                    title="Usuń karę"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>

                      {isUserReferee && variant === "upcoming" && (
                        <div className="text-xs">
                          <span className="font-semibold mr-1">Dostępność:</span>
                          <span className="inline-flex items-center gap-2">
                            <button
                              className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded border",
                                m.myAvailabilitySet
                                  ? m.myAvailable
                                    ? "bg-green-50 border-green-300 text-green-700"
                                    : "bg-gray-100 border-gray-300 text-gray-500"
                                  : "bg-green-50 border-green-300 text-green-700"
                              )}
                              onClick={async () => {
                                try {
                                  await setMyAvailability(m.id, true);
                                  setState(s => ({
                                    ...s,
                                    matches: s.matches.map(x =>
                                      x.id === m.id ? { ...x, myAvailable: true, myAvailabilitySet: true } : x
                                    ),
                                  }));
                                } catch (e: any) {
                                  alert("Błąd zapisu dostępności: " + e.message);
                                }
                              }}
                            >
                              <span className="inline-flex items-center gap-1">
                                <Check
                                  className={clsx(
                                    "w-4 h-4",
                                    m.myAvailabilitySet ? (m.myAvailable ? "text-green-700" : "text-gray-400") : "text-green-700"
                                  )}
                                />
                                Dostępny
                              </span>
                            </button>

                            <button
                              className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded border",
                                m.myAvailabilitySet
                                  ? !m.myAvailable
                                    ? "bg-red-50 border-red-300 text-red-700"
                                    : "bg-gray-100 border-gray-300 text-gray-500"
                                  : "bg-red-50 border-red-300 text-red-700"
                              )}
                              onClick={async () => {
                                try {
                                  await setMyAvailability(m.id, false);
                                  setState(s => ({
                                    ...s,
                                    matches: s.matches.map(x =>
                                      x.id === m.id ? { ...x, myAvailable: false, myAvailabilitySet: true } : x
                                    ),
                                  }));
                                } catch (e: any) {
                                  alert("Błąd zapisu dostępności: " + e.message);
                                }
                              }}
                            >
                              <span className="inline-flex items-center gap-1">
                                <X
                                  className={clsx(
                                    "w-4 h-4",
                                    m.myAvailabilitySet ? (!m.myAvailable ? "text-red-700" : "text-gray-400") : "text-red-700"
                                  )}
                                />
                                Niedostępny
                              </span>
                            </button>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.commsByClub.home && (
                        <DocBadge
                          file={m.commsByClub.home}
                          label="Komunikat"
                          disabled={!canDownload}
                          canRemove={!!user && isAdmin(user)}
                          onRemove={async () => {
                            try {
                              await removeWholeSlot("comms", m.id, normKey(m.home), m.commsByClub.home!.path);
                              setState({
                                ...state,
                                matches: state.matches.map(x =>
                                  x.id === m.id ? { ...x, commsByClub: { ...x.commsByClub, home: null } } : x
                                ),
                              });
                            } catch (e: any) {
                              alert("Błąd usuwania: " + e.message);
                            }
                          }}
                        />
                      )}

                      {m.rosterByClub.home && (
                        <DocBadge
                          file={m.rosterByClub.home}
                          label="Skład (Home)"
                          disabled={!canDownload}
                          canRemove={!!user && isAdmin(user)}
                          onRemove={async () => {
                            try {
                              await removeWholeSlot("roster", m.id, normKey(m.home), m.rosterByClub.home!.path);
                              setState({
                                ...state,
                                matches: state.matches.map(x =>
                                  x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, home: null } } : x
                                ),
                              });
                            } catch (e: any) {
                              alert("Błąd usuwania: " + e.message);
                            }
                          }}
                        />
                      )}

                      {m.rosterByClub.away && (
                        <DocBadge
                          file={m.rosterByClub.away}
                          label="Skład (Away)"
                          disabled={!canDownload}
                          canRemove={!!user && isAdmin(user)}
                          onRemove={async () => {
                            try {
                              await removeWholeSlot("roster", m.id, normKey(m.away), m.rosterByClub.away!.path);
                              setState({
                                ...state,
                                matches: state.matches.map(x =>
                                  x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, away: null } } : x
                                ),
                              });
                            } catch (e: any) {
                              alert("Błąd usuwania: " + e.message);
                            }
                          }}
                        />
                      )}

                      {m.matchReport && (
                        <DocBadge
                          file={m.matchReport}
                          label="Protokół"
                          disabled={!canDownload}
                          canRemove={!!user && isAdmin(user)}
                          onRemove={async () => {
                            try {
                              await removeWholeSlot("report", m.id, "neutral", m.matchReport!.path);
                              setState({
                                ...state,
                                matches: state.matches.map(x => (x.id === m.id ? { ...x, matchReport: null } : x)),
                              });
                            } catch (e: any) {
                              alert("Błąd usuwania: " + e.message);
                            }
                          }}
                        />
                      )}

                      {m.reportPhotos.length > 0 && (
                        <span className={classes.pill}>
                          <Image className="w-3.5 h-3.5" />
                          Zdjęcia: {m.reportPhotos.length}
                        </span>
                      )}

                      {streamHref && (
                        <a
                          href={streamHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={clsx(classes.pill, "hover:shadow")}
                          title="Otwórz transmisję w nowej karcie"
                        >
                          ▶︎ Transmisja
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenActionsMatchId(current => (current === m.id ? null : m.id))}
                      className={clsx(classes.btnSecondary, "text-xs px-2 py-1")}
                    >
                      {openActionsMatchId === m.id ? "Ukryj akcje" : "Akcje"}
                    </button>

                    {openActionsMatchId === m.id && (
                      <div className="mt-2">
                        <PerMatchActions
                          state={state}
                          setState={setState}
                          user={user}
                          onPenaltiesChange={onRefresh}
                          fixedMatch={m}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="table-auto w-full text-xs sm:text-sm">
          <thead className="bg-white">
            <tr className="text-left border-b">
              <th className="px-2 py-1 whitespace-nowrap w-[90px] text-center">Data</th>
              <th className="px-2 py-1 whitespace-nowrap w-[80px] text-center">Nr meczu</th>

              <th className="px-2 py-1 break-words w-[120px]">Miejsce</th>
              <th className="px-2 py-1 break-words w-[150px]">Gospodarz</th>
              <th className="px-2 py-1 break-words w-[150px]">Goście</th>
              <th className="px-2 py-1 whitespace-nowrap w-[72px] text-center">Wynik</th>
              <th className="px-2 py-1 break-words w-[160px]">Sędziowie</th>
              <th className="px-2 py-1 break-words w-[120px]">Delegat</th>
              <th className="px-2 py-1 break-words w-[140px]">Kary (Gospodarz)</th>
              <th className="px-2 py-1 break-words w-[140px]">Kary (Goście)</th>
              <th className="px-2 py-1 break-words w-[140px]">Dokumenty</th>
              {variant === "upcoming" && isUserReferee && (
                <th className="px-2 py-1 whitespace-nowrap w-[110px] text-center">Dostępność</th>
              )}
              {isUserAdmin && <th className="px-2 py-1 break-words w-[220px]">Sędziowie dostępni</th>}
            </tr>
          </thead>

          <tbody>
            {groupedByRound.sortedRounds.map(runda => {
              const group = groupedByRound.groups[runda];
              return (
                <React.Fragment key={runda}>
                  <tr>
                    <td
                      colSpan={11 + (variant === "upcoming" && isUserReferee ? 1 : 0) + (isUserAdmin ? 1 : 0)}
                      className="bg-amber-50 border-y-2 border-amber-400 text-center font-semibold text-amber-800 py-2"
                    >
                      Runda {runda}
                    </td>
                  </tr>

                  {group.map((m, i) => {
                    const isLast = i === group.length - 1;
                    const sideBorders = "border-l-2 border-r-2 border-amber-400";
                    const bottomBorder = isLast ? "border-b-2 border-amber-400" : "";
                    const streamHref = sanitizeUrl(m.streamUrl);
                    const isEditingThisMatch = editingMatchId === m.id;

                    return (
                      <React.Fragment key={m.id}>
                        <tr
                          className={clsx(
                            "hover:bg-sky-50 transition-colors align-top",
                            rowStriping,
                            sideBorders,
                            isEditingThisMatch ? "bg-amber-50/80" : "",
                            isEditingThisMatch ? "" : bottomBorder
                          )}
                        >
                          <td className="px-2 py-1 whitespace-nowrap text-center">
                            {formatDate(m.date)}{m.time ? ` ${m.time}` : ""}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-center">{m.round ?? "-"}</td>
                          <td className="px-2 py-1 break-words">{m.location}</td>
                          <td className="px-2 py-1 break-words">{m.home}</td>
                          <td className="px-2 py-1 break-words">{m.away}</td>
                          <td className="px-2 py-1 whitespace-nowrap text-center">{renderResult(m)}</td>

                          <td className="px-2 py-1 break-words">
                            {m.referees.join(", ")}
                            {user && isAdmin(user) && onQuickEdit && (
                              <button
                                className="ml-2 underline text-blue-700"
                                onClick={() => onQuickEdit(m.id)}
                                title="Szybka edycja w panelu admina"
                              >
                                Edytuj
                              </button>
                            )}
                          </td>

                          <td className="px-2 py-1 break-words">{m.delegate ?? "-"}</td>

                          <td className="px-2 py-1">
                            {isGuest ? (
                              <span className="text-gray-500">–</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(penaltyMap.get(m.id)?.home || []).map(p => (
                                  <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                                    {p.name}
                                    {user && (isAdmin(user) || isDelegate(user)) && (
                                      <button
                                        onClick={() => onRemovePenalty(p.id)}
                                        className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                                        title="Usuń karę"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </span>
                                ))}
                                {(penaltyMap.get(m.id)?.home || []).length === 0 && <span className="text-gray-500">–</span>}
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-1">
                            {isGuest ? (
                              <span className="text-gray-500">–</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(penaltyMap.get(m.id)?.away || []).map(p => (
                                  <span key={p.id} className={clsx(classes.pill, "border-red-300 text-red-700 bg-red-50")}>
                                    {p.name}
                                    {user && (isAdmin(user) || m.delegate === user.name) && (
                                      <button
                                        onClick={() => onRemovePenalty(p.id)}
                                        className="ml-1 rounded px-1 leading-none hover:bg-red-100"
                                        title="Usuń karę"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </span>
                                ))}
                                {(penaltyMap.get(m.id)?.away || []).length === 0 && <span className="text-gray-500">–</span>}
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-1">
                            <div className="flex flex-wrap gap-2">
                              {m.commsByClub.home && (
                                <DocBadge
                                  file={m.commsByClub.home}
                                  label="Komunikat"
                                  disabled={!canDownload}
                                  canRemove={!!user && isAdmin(user)}
                                  onRemove={async () => {
                                    try {
                                      await removeWholeSlot("comms", m.id, normKey(m.home), m.commsByClub.home!.path);
                                      setState({
                                        ...state,
                                        matches: state.matches.map(x =>
                                          x.id === m.id ? { ...x, commsByClub: { ...x.commsByClub, home: null } } : x
                                        ),
                                      });
                                    } catch (e: any) {
                                      alert("Błąd usuwania: " + e.message);
                                    }
                                  }}
                                />
                              )}

                              {m.rosterByClub.home && (
                                <DocBadge
                                  file={m.rosterByClub.home}
                                  label="Skład (Home)"
                                  disabled={!canDownload}
                                  canRemove={!!user && isAdmin(user)}
                                  onRemove={async () => {
                                    try {
                                      await removeWholeSlot("roster", m.id, normKey(m.home), m.rosterByClub.home!.path);
                                      setState({
                                        ...state,
                                        matches: state.matches.map(x =>
                                          x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, home: null } } : x
                                        ),
                                      });
                                    } catch (e: any) {
                                      alert("Błąd usuwania: " + e.message);
                                    }
                                  }}
                                />
                              )}

                              {m.rosterByClub.away && (
                                <DocBadge
                                  file={m.rosterByClub.away}
                                  label="Skład (Away)"
                                  disabled={!canDownload}
                                  canRemove={!!user && isAdmin(user)}
                                  onRemove={async () => {
                                    try {
                                      await removeWholeSlot("roster", m.id, normKey(m.away), m.rosterByClub.away!.path);
                                      setState({
                                        ...state,
                                        matches: state.matches.map(x =>
                                          x.id === m.id ? { ...x, rosterByClub: { ...x.rosterByClub, away: null } } : x
                                        ),
                                      });
                                    } catch (e: any) {
                                      alert("Błąd usuwania: " + e.message);
                                    }
                                  }}
                                />
                              )}

                              {m.matchReport && (
                                <DocBadge
                                  file={m.matchReport}
                                  label="Protokół"
                                  disabled={!canDownload}
                                  canRemove={!!user && isAdmin(user)}
                                  onRemove={async () => {
                                    try {
                                      await removeWholeSlot("report", m.id, "neutral", m.matchReport!.path);
                                      setState({
                                        ...state,
                                        matches: state.matches.map(x => (x.id === m.id ? { ...x, matchReport: null } : x)),
                                      });
                                    } catch (e: any) {
                                      alert("Błąd usuwania: " + e.message);
                                    }
                                  }}
                                />
                              )}

                              {m.reportPhotos.length > 0 && (
                                <span className={classes.pill}>
                                  <Image className="w-3.5 h-3.5" />
                                  Zdjęcia: {m.reportPhotos.length}
                                </span>
                              )}

                              {streamHref && (
                                <a
                                  href={streamHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={clsx(classes.pill, "hover:shadow")}
                                  title="Otwórz transmisję w nowej karcie"
                                >
                                  ▶︎ Transmisja
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setOpenActionsMatchId(current => (current === m.id ? null : m.id))}
                                className={clsx(classes.btnSecondary, "text-xs px-2 py-1")}
                              >
                                {openActionsMatchId === m.id ? "Ukryj akcje" : "Akcje"}
                              </button>
                            </div>
                          </td>

                          {variant === "upcoming" && isUserReferee && (
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-2 justify-center">
                                <button
                                  className={clsx(
                                    "px-2 py-1 rounded border text-sm min-w-[36px]",
                                    m.myAvailabilitySet
                                      ? m.myAvailable
                                        ? "bg-green-50 border-green-300 text-green-700"
                                        : "bg-gray-100 border-gray-300 text-gray-500"
                                      : "bg-green-50 border-green-300 text-green-700"
                                  )}
                                  title="Jestem dostępny"
                                  onClick={async () => {
                                    try {
                                      await setMyAvailability(m.id, true);
                                      setState(s => ({
                                        ...s,
                                        matches: s.matches.map(x =>
                                          x.id === m.id ? { ...x, myAvailable: true, myAvailabilitySet: true } : x
                                        ),
                                      }));
                                    } catch (e: any) {
                                      alert("Błąd zapisu dostępności: " + e.message);
                                    }
                                  }}
                                >
                                  <Check
                                    className={clsx(
                                      "w-4 h-4",
                                      m.myAvailabilitySet ? (m.myAvailable ? "text-green-700" : "text-gray-400") : "text-green-700"
                                    )}
                                  />
                                </button>

                                <button
                                  className={clsx(
                                    "px-2 py-1 rounded border text-sm min-w-[36px]",
                                    m.myAvailabilitySet
                                      ? !m.myAvailable
                                        ? "bg-red-50 border-red-300 text-red-700"
                                        : "bg-gray-100 border-gray-300 text-gray-500"
                                      : "bg-red-50 border-red-300 text-red-700"
                                  )}
                                  title="Nie mogę"
                                  onClick={async () => {
                                    try {
                                      await setMyAvailability(m.id, false);
                                      setState(s => ({
                                        ...s,
                                        matches: s.matches.map(x =>
                                          x.id === m.id ? { ...x, myAvailable: false, myAvailabilitySet: true } : x
                                        ),
                                      }));
                                    } catch (e: any) {
                                      alert("Błąd zapisu dostępności:" + e.message);
                                    }
                                  }}
                                >
                                  <X
                                    className={clsx(
                                      "w-4 h-4",
                                      m.myAvailabilitySet ? (!m.myAvailable ? "text-red-700" : "text-gray-400") : "text-red-700"
                                    )}
                                  />
                                </button>
                              </div>
                            </td>
                          )}

                          {isUserAdmin && (
                            <td className="px-2 py-1 break-words">
                              <AdminAvailableReferees matchId={m.id} />
                            </td>
                          )}
                        </tr>

                        {openActionsMatchId === m.id && (
                          <tr className={clsx(sideBorders, bottomBorder)}>
                            <td
                              colSpan={11 + (variant === "upcoming" && isUserReferee ? 1 : 0) + (isUserAdmin ? 1 : 0)}
                              className="px-2 py-2 bg-slate-50"
                            >
                              <PerMatchActions
                                state={state}
                                setState={setState}
                                user={user}
                                onPenaltiesChange={onRefresh}
                                fixedMatch={m}
                              />
                            </td>
                          </tr>
                        )}

                        {user && isAdmin(user) && isEditingThisMatch && renderAdminPanel && (
                          <tr className={clsx(sideBorders, bottomBorder)}>
                            <td
                              colSpan={11 + (variant === "upcoming" && isUserReferee ? 1 : 0) + (isUserAdmin ? 1 : 0)}
                              className="px-2 py-2 bg-slate-50"
                            >
                              <div ref={activeEditorRef}>{renderAdminPanel(m)}</div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
};
