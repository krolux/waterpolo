import React from "react";
import { supabase } from "../lib/supabase";

const cls = {
  btn: "px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50",
  primary: "px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700",
};

type Row = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  approved: boolean;
  role: string | null;
  created_at: string;
};

export const UserModeration: React.FC = () => {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, approved, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data as Row[]);
    } catch (e: any) {
      alert("Błąd pobierania profili: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: true })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert("Błąd akceptacji: " + e.message);
    }
  }

  async function revoke(id: string) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: false })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert("Błąd cofnięcia zgody: " + e.message);
    }
  }

  return (
    <section className="max-w-6xl mx-auto rounded-2xl p-4 bg-white/60 border border-white/40 shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Moderacja użytkowników</h2>
        <button className={cls.btn} onClick={load}>{loading ? "Ładowanie…" : "Odśwież"}</button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Użytkownik</th>
              <th className="text-left p-2">Nazwa konta</th>
              <th className="text-left p-2">Rola</th>
              <th className="text-left p-2">Utworzono</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="p-2">{r.display_name || "—"}</td>
                <td className="p-2">{r.role || "User"}</td>
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.approved ? "zatwierdzony" : "oczekuje"}</td>
                <td className="p-2">
                  {r.approved ? (
                    <button className={cls.btn} onClick={() => revoke(r.id)}>Cofnij</button>
                  ) : (
                    <button className={cls.primary} onClick={() => approve(r.id)}>Zatwierdź</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td className="p-2 text-sm text-gray-600" colSpan={6}>Brak użytkowników.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
