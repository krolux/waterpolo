// src/components/AdminUserApprovals.tsx
import React from "react";
import { supabase } from "../lib/supabase";

type Row = {
  id: string;
  display_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  club_name?: string | null;
  created_at?: string | null;
};

export const AdminUserApprovals: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    // Pobieramy tylko nieaktywne (oczekujące) profile.
    // Pola first_name/last_name/email traktujemy opcjonalnie – jeśli ich nie masz, wynik i tak zadziała.
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        display_name,
        first_name,
        last_name,
        email,
        created_at,
        club:clubs(name)
      `)
      .eq("is_active", false)
      .order("created_at", { ascending: true });

    if (error) {
      alert("Błąd pobierania listy: " + error.message);
      setRows([]);
    } else {
      const mapped: Row[] = (data || []).map((r: any) => ({
        id: r.id,
        display_name: r.display_name ?? null,
        first_name: r.first_name ?? null,
        last_name: r.last_name ?? null,
        email: r.email ?? null,
        club_name: r.club?.name ?? null,
        created_at: r.created_at ?? null,
      }));
      setRows(mapped);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    if (!confirm("Akceptować tego użytkownika?")) return;
    setUpdating(id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", id);
    setUpdating(null);
    if (error) {
      alert("Błąd aktualizacji: " + error.message);
      return;
    }
    // usuń z listy bez dodatkowego zapytania
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Akceptacja nowych użytkowników</h2>
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Wróć
        </button>
      </div>

      <div className="rounded-2xl p-3 sm:p-4 md:p-6 bg-white/60 backdrop-blur-xl border border-white/40 shadow">
        {loading ? (
          <div className="text-sm text-gray-600">Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-600">Brak oczekujących użytkowników.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr className="text-left border-b">
                  <th className="px-2 py-2">Nick</th>
                  <th className="px-2 py-2">Imię</th>
                  <th className="px-2 py-2">Nazwisko</th>
                  <th className="px-2 py-2">Klub</th>
                  <th className="px-2 py-2">E-mail</th>
                  <th className="px-2 py-2 w-40 text-center">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={`border-b ${i % 2 ? "bg-slate-50/60" : "bg-white"}`}>
                    <td className="px-2 py-2 break-words">{r.display_name || "—"}</td>
                    <td className="px-2 py-2 break-words">{r.first_name || "—"}</td>
                    <td className="px-2 py-2 break-words">{r.last_name || "—"}</td>
                    <td className="px-2 py-2 break-words">{r.club_name || "—"}</td>
                    <td className="px-2 py-2 break-words">{r.email || "—"}</td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => approve(r.id)}
                        disabled={updating === r.id}
                        className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow disabled:opacity-50"
                        title="Zmień status na aktywny"
                      >
                        {updating === r.id ? "Zapisywanie…" : "Akceptuj"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
