// src/components/ArticleModeration.tsx
import React from "react";
import { supabase } from "../lib/supabase";
import {
  type Article,
  publishArticle,
  rejectArticle,
} from "../lib/articles";

type Props = {
  onBack: () => void;
  onEdit: (id: string) => void;
};

const btn = {
  base: "px-3 py-2 rounded-lg border bg-white hover:bg-gray-50",
  primary: "px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700",
  danger: "px-3 py-2 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50",
};

export const ArticleModeration: React.FC<Props> = ({ onBack, onEdit }) => {
  const [rows, setRows] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "pending")
      .order("updated_at", { ascending: false });
    if (!error) setRows((data || []) as Article[]);
    setLoading(false);
  }, []);

  React.useEffect(() => { reload(); }, [reload]);

  async function doPublish(id: string) {
    const editorId = (await supabase.auth.getUser()).data.user?.id || undefined;
    await publishArticle(id, editorId);
    await reload();
  }

  async function doReject(id: string) {
    await rejectArticle(id);
    await reload();
  }

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button className={btn.base} onClick={onBack}>← Wróć do aktualności</button>
        <h2 className="text-2xl font-semibold">Moderacja artykułów</h2>
      </div>

      {loading && <div className="text-sm text-gray-600">Wczytywanie…</div>}

      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-600">Brak artykułów oczekujących na akceptację.</div>
      )}

      <div className="space-y-2">
        {rows.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border bg-white p-3 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-xs text-gray-600">
                Status: {a.status} • ostatnia zmiana: {new Date(a.updated_at).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button className={btn.base} onClick={() => onEdit(a.id)}>Edytuj</button>
              <button className={btn.primary} onClick={() => doPublish(a.id)}>Publikuj</button>
              <button className={btn.danger} onClick={() => doReject(a.id)}>Odrzuć</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
