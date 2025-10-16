// src/components/Comments.tsx
import React from "react";
import { addComment, listComments } from "../lib/articles";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { supabase } from "../lib/supabase";

type CommentRow = {
  id: string;
  body: string;
  author_name?: string | null;
  created_at: string;
};

const MAX_LEN = 1000;

export const Comments: React.FC<{ articleId: string }> = ({ articleId }) => {
  const { userDisplay, role } = useSupabaseAuth();
  const [list, setList] = React.useState<CommentRow[]>([]);
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // status akceptacji profilu (wymagany do komentowania)
  const [approved, setApproved] = React.useState<boolean | null>(null);

  // pobierz status approved dla zalogowanego
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // jeśli gość – nie ma profilu do sprawdzania
      if (!userDisplay || role === "Guest") {
        setApproved(null);
        return;
      }
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) {
          setApproved(null);
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", uid)
          .single();
        if (!cancelled) setApproved(error ? null : !!data?.approved);
      } catch {
        if (!cancelled) setApproved(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userDisplay, role]);

  const reload = React.useCallback(() => {
    listComments(articleId).then(setList).catch(console.error);
  }, [articleId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const isLogged = !!userDisplay && role && role !== "Guest";
  const canComment = isLogged && approved === true;
  const waitingForApproval = isLogged && approved === false;

  async function handleSend() {
    const txt = body.trim();
    if (!txt || !canComment || submitting) return;

    try {
      setSubmitting(true);

      // optymistycznie dopisz na listę
      const optimistic: CommentRow = {
        id: `tmp-${Date.now()}`,
        body: txt,
        author_name: userDisplay || "—",
        created_at: new Date().toISOString(),
      };
      setList((prev) => [optimistic, ...prev]);
      setBody("");

      await addComment(articleId, txt);
      // po sukcesie – dociągnij z serwera (z prawidłowym id)
      reload();
    } catch (e: any) {
      alert(
        "Nie udało się dodać komentarza: " +
          (e?.message || "spróbuj ponownie później.")
      );
      // cofnij optymistyczny wpis
      setList((prev) => prev.filter((x) => !String(x.id).startsWith("tmp-")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Komentarze</h3>
        <button
          className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50 text-sm"
          onClick={reload}
          title="Odśwież komentarze"
        >
          Odśwież
        </button>
      </div>

      {/* Lista komentarzy */}
      <div className="space-y-3 mb-4">
        {list.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border bg-white/60 backdrop-blur p-3"
          >
            <div className="text-xs text-gray-600 mb-1">
              {c.author_name || "Anonim"} •{" "}
              {new Date(c.created_at).toLocaleString()}
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">
              {c.body}
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-sm text-gray-500">Brak komentarzy.</div>
        )}
      </div>

      {/* Formularz dodawania */}
      {!isLogged && (
        <div className="text-sm text-gray-600">
          Zaloguj się, aby komentować.
        </div>
      )}

      {waitingForApproval && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          Twoje konto zostało utworzone i czeka na akceptację administratora.
          Po zatwierdzeniu możliwość komentowania zostanie automatycznie
          odblokowana.
        </div>
      )}

      {canComment && (
        <div>
          <textarea
            className="w-full border rounded-xl p-2 mb-2"
            rows={3}
            placeholder="Dodaj komentarz…"
            maxLength={MAX_LEN}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {body.length}/{MAX_LEN}
            </span>
            <button
              className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
              disabled={submitting || body.trim().length === 0}
              onClick={handleSend}
            >
              Wyślij
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
