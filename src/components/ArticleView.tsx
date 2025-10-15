// src/components/ArticleView.tsx
import React from "react";
import { supabase } from "../lib/supabase";
import { getPublicUrl, type Article } from "../lib/articles";
import { Comments } from "./Comments";

export type ArticleViewProps = {
  /** ID artykułu do wyświetlenia */
  id: string;
  /** powrót do listy */
  onBack: () => void;
  /** opcjonalnie: pokaż przycisk "Edytuj" (np. dla Admin/Editor) */
  onEdit?: () => void;
};

export const ArticleView: React.FC<ArticleViewProps> = ({ id, onBack, onEdit }) => {
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
        alert("Nie udało się wczytać artykułu: " + error.message);
        return;
      }
      if (!cancelled && data) setArticle(data as Article);

      const authorId = (data as Article)?.author_id;
      if (authorId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, author_footer, bio")
          .eq("id", authorId)
          .single();
        if (!cancelled && prof) setAuthor(prof as any);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cover = getPublicUrl(article?.cover_path || undefined);

  if (!article) {
    return (
      <article className="max-w-3xl mx-auto">
        <button className="text-sm underline mb-2" onClick={onBack}>
          ← Wróć do aktualności
        </button>
        <div className="text-sm text-gray-600">Wczytywanie…</div>
      </article>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button className="text-sm underline" onClick={onBack}>
          ← Wróć do aktualności
        </button>
        {onEdit && (
          <button className="text-sm underline" onClick={onEdit}>
            Edytuj
          </button>
        )}
      </div>

      {cover && (
        <img src={cover} alt={article.title} className="w-full rounded-xl mb-3" />
      )}

      <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
      {article.excerpt && (
        <p className="text-lg text-gray-700 mb-4">{article.excerpt}</p>
      )}

      {article.content && (
        <div
          className="prose max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
        // Jeśli trzymasz Markdown – zrenderuj markdownem (np. marked)
      )}

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

      <Comments articleId={article.id} />
    </article>
  );
};
