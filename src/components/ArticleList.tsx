// src/components/ArticleList.tsx
import React from "react";
import { listPublishedPaged, getPublicUrl, Article } from "../lib/articles";

export const ArticleList: React.FC<{ onOpen:(a:Article)=>void }> = ({ onOpen }) => {
  const [rows, setRows] = React.useState<Article[]>([]);
  React.useEffect(() => {
    listPublishedPaged(0, 29).then(setRows).catch(console.error);
  }, []);
  return (
    <section className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-3">Wszystkie aktualności</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(a => {
          const url = getPublicUrl(a.cover_path);
          return (
            <article key={a.id} className="rounded-2xl overflow-hidden border bg-white hover:shadow transition" onClick={()=>onOpen(a)}>
              {url && <img src={url} className="w-full h-40 object-cover" alt={a.title}/>}
              <div className="p-3">
                <h3 className="font-semibold mb-1 line-clamp-2">{a.title}</h3>
                {a.excerpt && <p className="text-sm text-gray-600 line-clamp-3">{a.excerpt}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
