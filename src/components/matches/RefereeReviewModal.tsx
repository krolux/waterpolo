import React from "react";
import {
  MATCH_DIFFICULTIES,
  submitRefereeReviews,
  type MatchDifficulty,
} from "../../lib/refereeRatings";

export function RefereeReviewModal({
  matchId,
  referees,
  onCancel,
  onSaved,
}: {
  matchId: string;
  referees: string[];
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const names = [...new Set(referees.filter(Boolean))];
  const [scores, setScores] = React.useState<Record<string, string>>(
    Object.fromEntries(names.map((name) => [name, ""])),
  );
  const [difficulty, setDifficulty] = React.useState<MatchDifficulty>("Średni");
  const [saving, setSaving] = React.useState(false);
  const save = async () => {
    const ratings = names.map((name) => ({
      name,
      score: Number(scores[name]),
    }));
    if (
      ratings.some(
        (item) =>
          !Number.isInteger(item.score) || item.score < 1 || item.score > 10,
      )
    )
      return alert("Wpisz każdemu sędziemu ocenę od 1 do 10.");
    setSaving(true);
    try {
      await submitRefereeReviews(matchId, ratings, difficulty);
      await onSaved();
    } catch (e) {
      alert(
        "Nie udało się zapisać ocen: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-xl font-bold text-[#061a33]">
          Ocena obsady sędziowskiej
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Oceny są prywatne i widoczne wyłącznie administratorowi. Ich zapis
          jest niezależny od zatwierdzenia protokołu.
        </p>
        <div className="mt-4 space-y-3">
          {names.map((name) => (
            <label
              key={name}
              className="grid grid-cols-[1fr_100px] items-center gap-3 text-sm font-semibold"
            >
              <span>{name}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={scores[name]}
                onChange={(e) =>
                  setScores((v) => ({ ...v, [name]: e.target.value }))
                }
                placeholder="1–10"
                className="rounded-xl border px-3 py-2"
              />
            </label>
          ))}
          <label className="block text-sm font-semibold">
            Trudność meczu
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as MatchDifficulty)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
            >
              {MATCH_DIFFICULTIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border px-4 py-2">
            Anuluj
          </button>
          <button
            disabled={saving || !names.length}
            onClick={() => void save()}
            className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {saving ? "Zapisywanie…" : "Zapisz oceny"}
          </button>
        </div>
      </div>
    </div>
  );
}
