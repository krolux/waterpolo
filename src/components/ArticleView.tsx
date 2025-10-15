// src/components/ArticleView.tsx
import React from "react";
import { Article } from "../lib/articles";
import { supabase } from "../lib/supabase";
import { getPublicUrl } from "../lib/articles";
import { Comments } from "./Comments";

export const ArticleView: React.FC<{ article: Article; onBack: ()=>void }> = ({ article, onBack }) => {
  const [author, setAuthor] = React.useState<{display_name:string; avatar_url?:string|null; author_footer?:string|null; bio?:string|null}>({display_name:""});
  React.useEffect(() => {
    supabase.from('profiles').select('display_name, avatar_url, author_footer, bio').eq('id', article.author_id).single()
      .then(({data}) => data && setAuthor(data as any));
  }, [article.author_id]);

  const cover = getPublicUrl(article.cover_path);

  return (
    <article className="max-w-3xl mx-auto">
      <button className="text-sm underline mb-2" onClick={onBack}>← Wróć</button>
      {cover && <img src={cover} alt={article.title} className="w-full rounded-xl mb-3" />}
      <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
      {article.excerpt && <p className="text-lg text-gray-700 mb-4">{article.excerpt}</p>}
      {article.content && (
        <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{__html: article.content}} />
        // jeśli trzymasz Markdown – zrenderuj markdownem (np. marked)
      )}

      <div className="border-t pt-4 mt-6">
        <div className="flex gap-3 items-center">
          {author?.avatar_url && <img src={author.avatar_url} alt={author.display_name} className="w-12 h-12 rounded-full object-cover" />}
          <div>
            <div className="font-semibold">O autorze: {author.display_name}</div>
            {author.author_footer && <div className="text-sm text-gray-700">{author.author_footer}</div>}
          </div>
        </div>
      </div>

      <Comments articleId={article.id} />
    </article>
  );
};
