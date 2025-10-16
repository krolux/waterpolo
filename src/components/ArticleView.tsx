import React from "react";
import { Article } from "../lib/articles";
import { supabase } from "../lib/supabase";
import { getPublicUrl } from "../lib/articles";

export type ArticleViewProps = {
  id: string;
  onBack: () => void;         // przejście do listy artykułów
  onGoHome?: () => void;      // alternatywne (HOME) – zgodność z App.tsx
  onEdit?: () => void;
};

export const ArticleView: React.FC<ArticleViewProps> = ({ id, onBack, onGoHome, onEdit }) => {
  const [article, setArticle] = React.useState<Article | null>(null);
  const [author, setAuthor] = React.useState<{
    display_name: string;
    avatar_url?: string | null;
    author_footer?: string | null;
    bio?: string | null;
  }>({ display_name: "" });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data && !cancelled) setArticle(data as Article);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  React.useEffect(() => {
    if (!article?.author_id) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url, author_footer, bio")
      .eq("id", article.author_id)
      .single()
      .then(({ data }) => data && setAuthor(data as any));
  }, [article?.author_id]);

  if (!article) {
    return (
      <section className="max-w-6xl mx-auto">
        <div className="text-sm text-gray-600">Ładowanie artykułu…</div>
      </section>
    );
  }

  const cover = getPublicUrl(article.cover_path);

  const goHome = () => {
    if (onGoHome) onGoHome();
    else window.dispatchEvent(new CustomEvent("goHome"));
  };

  return (
    <section className="max-w-6xl mx-auto">
      {/* Nawigacja */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow"
            onClick={goHome}
          >
            Strona główna
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow"
            onClick={onBack}
          >
            Lista artykułów
          </button>
        </div>
        {onEdit && (
          <button
            className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            onClick={onEdit}
          >
            Edytuj
          </button>
        )}
      </div>

      {/* Kafelek artykułu */}
      <article className="rounded-2xl p-3 sm:p-4 md:p-6 bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        {cover && (
          <img
            src={cover}
            alt={article.title}
            className="w-full max-h-[380px] object-contain bg-white rounded-xl mb-4"
          />
        )}

        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
        {article.excerpt && (
          <p className="text-lg text-gray-700 mb-3">{article.excerpt}</p>
        )}

        {article.content && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}

        {/* === Tagi NA SAMYM DOLE (po treści) === */}
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="mt-6">
            <div className="mb-1 text-sm font-medium text-gray-700">Tagi:</div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 text-xs rounded-full border bg-white text-amber-700 border-amber-200"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Autor */}
        <div className="border-t pt-4 mt-6">
          <div className="flex gap-3 items-center">
            {author?.avatar_url && (
              <img
                src={author.avatar_url}
                alt={author.display_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <div className="font-semibold">
                Autor: {author.display_name || "—"}
              </div>
              {author.author_footer && (
                <div className="text-sm text-gray-700">{author.author_footer}</div>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
};
