import React from "react";
import { supabase } from "../lib/supabase";
import { getPublicUrl, type Article } from "../lib/articles";

type Props = {
  /** id artykułu do wyświetlenia */
  id: string;
  /** przejście do listy artykułów */
  onBack: () => void;
  /** przejście na stronę główną (opcjonalnie) */
  onGoHome?: () => void;
  /** edycja (tylko dla Admin/Editor) – opcjonalnie */
  onEdit?: () => void;
};

const shell =
  "rounded-2xl p-4 md:p-6 bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.08)]";
const btn =
  "px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow whitespace-nowrap";
const btnSecondary =
  "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 whitespace-nowrap";

export const ArticleView: React.FC<Props> = ({ id, onBack, onGoHome, onEdit }) => {
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
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).single();
      if (error) {
        alert("Nie udało się pobrać artykułu: " + error.message);
        return;
      }
      if (!cancelled) setArticle(data as Article);

      const aId = (data as Article)?.author_id;
      if (aId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, author_footer, bio")
          .eq("id", aId)
          .single();
        if (!cancelled && prof) setAuthor(prof as any);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cover = getPublicUrl(article?.cover_path);

  if (!article) {
    return (
      <section className="max-w-4xl mx-auto">
        <div className={shell}>Ładowanie…</div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto">
      {/* Pasek akcji */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button className={btn} onClick={onGoHome}>
              Strona główna
            </button>
          )}
          <button className={btnSecondary} onClick={onBack}>
            Lista artykułów
          </button>
        </div>

        {onEdit && (
          <button className={btnSecondary} onClick={onEdit}>
            Edytuj
          </button>
        )}
      </div>

      {/* Kafelek z treścią */}
      <article className={shell}>
        {cover && (
          <img
            src={cover}
            alt={article.title}
            className="w-full max-h-[360px] object-contain bg-white rounded-xl mb-4 p-2 border"
          />
        )}

        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>

        {article.excerpt && (
          <p className="text-lg text-gray-700 mb-4">{article.excerpt}</p>
        )}

        {article.content && (
          <div
            className="prose prose-lg max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}

        {/* Stopka autora w kafelku */}
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
              <div className="font-semibold">O autorze: {author.display_name}</div>
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
