// src/components/NewsStrip.tsx
import React from "react";
import { listTopPublished, getPublicUrl, Article } from "../lib/articles";

const cardBase = "rounded-2xl overflow-hidden border bg-white shadow hover:shadow-md transition";
const imgCls = "w-full h-40 object-cover";

export const NewsStrip: React.FC<{ onMore?: () => void; onOpen?: (a: Article) => void; }> = ({ onMore, onOpen }) => {
  const [items, setItems] = React.useState<Article[]>([]);
  React.useEffect(() => {
    listTopPublished(3).then(setItems).catch(console.error);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-2xl font-semibold">Aktualności</h2>
        <button className="text-sm underline" onClick={onMore}>Więcej »</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(a => {
          const url = getPublicUrl(a.cover_path);
          return (
            <article key={a.id} className={cardBase} onClick={() => onOpen?.(a)}>
              {url && <img src={url} alt={a.title} className={imgCls} />}
              <div className="p-3">
                <h3 className="font-semibold leading-tight mb-1 line-clamp-2">{a.title}</h3>
                {a.excerpt && <p className="text-sm text-gray-600 line-clamp-3">{a.excerpt}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
