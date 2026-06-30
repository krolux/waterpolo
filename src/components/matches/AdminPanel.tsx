import React, { useEffect, useState } from "react";
import { Edit, Save, Settings, Trash2 } from "lucide-react";
import { createMatch, updateMatch as dbUpdateMatch, deleteMatch as dbDeleteMatch } from "../../lib/matches";
import { namesOfAvailableReferees } from "../../lib/availability";
import { Section } from "../shared/Section";
import type { AppState, Match } from "../../types/wpolo";

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const classes = {
  input: "w-full px-3 py-2 rounded-xl border border-[#dbeafe] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:border-sky-300",
  btnPrimary: "px-3 py-2 rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white font-semibold hover:from-[#0f99ff] hover:to-[#4acbff] shadow-[0_10px_20px_rgba(5,140,255,0.24)]",
  btnSecondary: "px-3 py-2 rounded-xl border border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50",
  iconBtn: "p-2 rounded-lg border border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50",
};

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

type AdminPanelProps = {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  clubs: readonly string[];
  refereeNames: string[];
  delegateNames: string[];
  onAfterChange: () => void;
  canWrite: boolean;
  editingMatchId?: string | null;
  clearEditing?: () => void;
  compact?: boolean;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  state,
  setState,
  clubs,
  refereeNames,
  delegateNames,
  onAfterChange,
  canWrite,
  editingMatchId,
  clearEditing,
  compact = false,
}) => {
  const blank: Match = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    time: "",
    round: "",
    seriesRound: null,
    location: "",
    home: "",
    away: "",
    referees: ["", ""],
    delegate: "",
    commsByClub: { home: null, away: null },
    rosterByClub: { home: null, away: null },
    matchReport: null,
    reportPhotos: [],
    notes: "",
    result: "",
    uploadsLog: [],
    streamUrl: null,
  };

  const [draft, setDraft] = useState<Match>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [availNames, setAvailNames] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!draft?.id) {
          if (!cancelled) setAvailNames(new Set());
          return;
        }

        const result: unknown = await namesOfAvailableReferees(draft.id);

        let safe = new Set<string>();

        if (result instanceof Set) {
          safe = new Set<string>(Array.from(result as Set<unknown>).map(String).filter(Boolean));
        } else if (Array.isArray(result)) {
          const arr = (result as any[])
            .map(r => {
              if (typeof r === "string") return r;
              if (r && typeof r === "object") {
                if (typeof (r as any).name === "string") return (r as any).name;
                if (typeof (r as any).display_name === "string") return (r as any).display_name;
              }
              return "";
            })
            .filter((x) => typeof x === "string" && x.length > 0);
          safe = new Set<string>(arr);
        }

        if (!cancelled) setAvailNames(safe);
      } catch (e: any) {
        console.warn("namesOfAvailableReferees error:", e?.message || e);
        if (!cancelled) setAvailNames(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft?.id]);

  useEffect(() => {
    if (!editingMatchId) return;
    const m = state.matches.find(x => x.id === editingMatchId);
    if (m) {
      setDraft(m);
      setEditId(m.id);
    }
  }, [editingMatchId, state.matches]);

  function toDbRow(m: Match) {
    return {
      date: m.date,
      time: m.time || null,
      round: m.round || null,
      series_round: m.seriesRound || null,
      location: m.location,
      home: m.home,
      away: m.away,
      result: m.result || null,
      referee1: m.referees[0] || null,
      referee2: m.referees[1] || null,
      delegate: m.delegate || null,
      notes: m.notes || null,
      stream_url: sanitizeUrl(m.streamUrl) || null,
    };
  }

  async function saveDraft() {
    if (!canWrite) {
      alert("Tylko Admin może zapisywać mecze do bazy.");
      return;
    }
    if (!draft.home || !draft.away || !draft.location || !draft.date) {
      alert("Uzupełnij: data, miejsce, drużyny");
      return;
    }
    try {
      if (editId) {
        await dbUpdateMatch(editId, toDbRow(draft));
      } else {
        await createMatch(toDbRow(draft) as any);
      }
      setDraft({ ...blank, id: crypto.randomUUID() });
      setEditId(null);
      clearEditing?.();
      onAfterChange();
    } catch (e: any) {
      alert("Błąd zapisu: " + e.message);
    }
  }

  async function removeMatch(id: string) {
    if (!canWrite) {
      alert("Tylko Admin może usuwać mecze.");
      return;
    }
    if (!confirm("Usunąć mecz?")) return;
    try {
      await dbDeleteMatch(id);
      onAfterChange();
    } catch (e: any) {
      alert("Błąd usuwania: " + e.message);
    }
  }

  if (compact) {
    return (
      <div className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-3 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-slate-700">Edytuj mecz</div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input className={classes.input} type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
            <input className={classes.input} placeholder="Godzina (opcjonalnie)" value={draft.time || ""} onChange={e => setDraft({ ...draft, time: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className={classes.input} placeholder="Nr meczu" value={draft.round || ""} onChange={e => setDraft({ ...draft, round: e.target.value })} />
            <input className={classes.input} placeholder="Runda" value={draft.seriesRound || ""} onChange={e => setDraft({ ...draft, seriesRound: e.target.value })} />
            <input className={classes.input} placeholder="Miejsce" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={classes.input} value={draft.home} onChange={e => setDraft({ ...draft, home: e.target.value })}>
              <option value="">Wybierz gospodarza</option>
              {clubs.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className={classes.input} value={draft.away} onChange={e => setDraft({ ...draft, away: e.target.value })}>
              <option value="">Wybierz gości</option>
              {clubs.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={classes.input} value={draft.referees[0]} onChange={e => setDraft({ ...draft, referees: [e.target.value, draft.referees[1] || ""] })}>
              <option value="">Sędzia 1</option>
              {refereeNames.map(n => (
                <option key={n} value={n}>{n}{availNames.has(n) ? " ✓" : ""}</option>
              ))}
            </select>
            <select className={classes.input} value={draft.referees[1]} onChange={e => setDraft({ ...draft, referees: [draft.referees[0] || "", e.target.value] })}>
              <option value="">Sędzia 2</option>
              {refereeNames.map(n => (
                <option key={n} value={n}>{n}{availNames.has(n) ? " ✓" : ""}</option>
              ))}
            </select>
          </div>
          <select className={classes.input} value={draft.delegate || ""} onChange={e => setDraft({ ...draft, delegate: e.target.value })}>
            <option value="">Delegat</option>
            {delegateNames.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result || ""} onChange={e => setDraft({ ...draft, result: e.target.value })} />
          <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes || ""} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <input className={classes.input} placeholder="Link do transmisji (opcjonalny)" value={draft.streamUrl || ""} onChange={e => setDraft({ ...draft, streamUrl: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={saveDraft} className={clsx(classes.btnPrimary, "flex items-center gap-2")}><Save className="w-4 h-4" />{editId ? "Zapisz zmiany" : "Dodaj mecz"}</button>
            {editId && (
              <button className={classes.btnSecondary} onClick={() => { setDraft({ ...blank, id: crypto.randomUUID() }); setEditId(null); clearEditing?.(); }}>Anuluj edycję</button>
            )}
          </div>
          {!canWrite && <div className="text-xs text-amber-700">Zaloguj się jako Admin, aby dodać/edytować mecze.</div>}
        </div>
      </div>
    );
  }

  return (
    <Section title="Panel administratora (mecze w bazie)" icon={<Settings className="w-5 h-5" />}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="font-medium mb-2">Dodaj / edytuj mecz</div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input className={classes.input} type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
              <input className={classes.input} placeholder="Godzina (opcjonalnie)" value={draft.time || ""} onChange={e => setDraft({ ...draft, time: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className={classes.input} placeholder="Nr meczu" value={draft.round || ""} onChange={e => setDraft({ ...draft, round: e.target.value })} />
              <input className={classes.input} placeholder="Runda" value={draft.seriesRound || ""} onChange={e => setDraft({ ...draft, seriesRound: e.target.value })} />
              <input className={classes.input} placeholder="Miejsce" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className={classes.input} value={draft.home} onChange={e => setDraft({ ...draft, home: e.target.value })}>
                <option value="">Wybierz gospodarza</option>
                {clubs.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select className={classes.input} value={draft.away} onChange={e => setDraft({ ...draft, away: e.target.value })}>
                <option value="">Wybierz gości</option>
                {clubs.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className={classes.input} value={draft.referees[0]} onChange={e => setDraft({ ...draft, referees: [e.target.value, draft.referees[1] || ""] })}>
                <option value="">Sędzia 1</option>
                {refereeNames.map(n => (
                  <option key={n} value={n}>{n}{availNames.has(n) ? " ✓" : ""}</option>
                ))}
              </select>
              <select className={classes.input} value={draft.referees[1]} onChange={e => setDraft({ ...draft, referees: [draft.referees[0] || "", e.target.value] })}>
                <option value="">Sędzia 2</option>
                {refereeNames.map(n => (
                  <option key={n} value={n}>{n}{availNames.has(n) ? " ✓" : ""}</option>
                ))}
              </select>
            </div>
            <select className={classes.input} value={draft.delegate || ""} onChange={e => setDraft({ ...draft, delegate: e.target.value })}>
              <option value="">Delegat</option>
              {delegateNames.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <input className={classes.input} placeholder="Wynik (np. 10:9)" value={draft.result || ""} onChange={e => setDraft({ ...draft, result: e.target.value })} />
            <textarea className={classes.input + " min-h-[80px]"} placeholder="Notatki" value={draft.notes || ""} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
            <input className={classes.input} placeholder="Link do transmisji (opcjonalny)" value={draft.streamUrl || ""} onChange={e => setDraft({ ...draft, streamUrl: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={saveDraft} className={clsx(classes.btnPrimary, "flex items-center gap-2")}><Save className="w-4 h-4" />{editId ? "Zapisz zmiany" : "Dodaj mecz"}</button>
              {editId && (
                <button
                  className={classes.btnSecondary}
                  onClick={() => {
                    setDraft({ ...blank, id: crypto.randomUUID() });
                    setEditId(null);
                    clearEditing?.();
                  }}
                >
                  Anuluj edycję
                </button>
              )}
            </div>
            {!canWrite && <div className="text-xs text-amber-700">Zaloguj się jako Admin, aby dodać/edytować mecze.</div>}
          </div>
        </div>
        <div>
          <div className="font-medium mb-2">Istniejące mecze</div>
          <div className="flex flex-col gap-2">
            {state.matches.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-[#dbeafe] bg-white p-3 shadow-sm">
                <div>
                  <div className="font-medium">{m.date} {m.time ? m.time + " • " : ""}{m.home} vs {m.away}</div>
                  <div className="text-xs text-slate-600">{m.location} • Sędz.: {m.referees.join(", ")} • Deleg.: {m.delegate || "-"} • Wynik: {m.result || "-"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setDraft(m); setEditId(m.id); }} className={classes.iconBtn} title="Edytuj"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => removeMatch(m.id)} className={clsx(classes.iconBtn, "text-red-600")} title="Usuń"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {state.matches.length === 0 && <div className="text-sm text-gray-500">Brak meczów w bazie.</div>}
          </div>
        </div>
      </div>
    </Section>
  );
};
