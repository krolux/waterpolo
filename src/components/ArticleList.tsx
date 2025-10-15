// src/components/ArticleList.tsx
import React from "react";
import { listPublishedPaged, getPublicUrl, type Article } from "../lib/articles";

type Props = {
  onOpen?: (id: string) => void;
  onBack?: () => void; // pokaże przycisk „← Wróć do aktualności”, jeśli podasz
};

export const ArticleList: React.FC<Props> = ({ onOpen, onBack }) => {
  const [rows, setRows] = React.useState<Article[]>([]);

  React.useEffect(() => {
    listPublishedPaged(0, 29).then(setRows).catch(console.error);
  }, []);

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-2xl font-semibold">Wszystkie aktualności</h2>
        {onBack && (
          <button className="text-sm underline" onClick={onBack}>
            ← Wróć do aktualności
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-600">Brak artykułów do wyświetlenia.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((a) => {
            const url = getPublicUrl(a.cover_path);
            return (
              <article
                key={a.id}
                className="rounded-2xl overflow-hidden border bg-white hover:shadow transition cursor-pointer"
                onClick={() => a.id && onOpen?.(a.id)}
              >
                {url && (
                  <img
                    src={url}
                    className="w-full h-40 object-cover"
                    alt={a.title}
                    loading="lazy"
                  />
                )}
                <div className="p-3">
                  <h3 className="font-semibold mb-1 line-clamp-2">{a.title}</h3>
                  {a.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-3">{a.excerpt}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
