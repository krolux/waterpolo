// src/components/Comments.tsx
import React from "react";
import { addComment, listComments } from "../lib/articles";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";

export const Comments: React.FC<{ articleId: string }> = ({ articleId }) => {
  const { userDisplay, role } = useSupabaseAuth();
  const [list, setList] = React.useState<{id:string; body:string; author_name?:string; created_at:string}[]>([]);
  const [body, setBody] = React.useState("");

  const reload = React.useCallback(() => {
    listComments(articleId).then(setList).catch(console.error);
  }, [articleId]);

  React.useEffect(() => { reload(); }, [reload]);

  const canComment = !!userDisplay && role && role !== 'Guest';

  return (
    <section className="mt-8">
      <h3 className="text-lg font-semibold mb-2">Komentarze</h3>
      <div className="space-y-3 mb-4">
        {list.map(c => (
          <div key={c.id} className="border rounded-lg p-2">
            <div className="text-sm text-gray-600 mb-1">{c.author_name} • {new Date(c.created_at).toLocaleString()}</div>
            <div className="text-sm">{c.body}</div>
          </div>
        ))}
        {list.length === 0 && <div className="text-sm text-gray-500">Brak komentarzy.</div>}
      </div>

      {canComment ? (
        <div className="flex gap-2">
          <textarea className="w-full border rounded-lg p-2" rows={3} placeholder="Dodaj komentarz…" value={body} onChange={e=>setBody(e.target.value)} />
          <button className="px-3 py-2 rounded-lg bg-amber-600 text-white" onClick={async ()=>{
            const txt = body.trim();
            if (!txt) return;
            try { await addComment(articleId, txt); setBody(""); reload(); } catch(e:any){ alert("Błąd: " + e.message); }
          }}>Wyślij</button>
        </div>
      ) : (
        <div className="text-sm text-gray-600">Zaloguj się, aby komentować.</div>
      )}
    </section>
  );
};
