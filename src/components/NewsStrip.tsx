// src/components/NewsStrip.tsx
import React from "react";
import { listTopPublished, getPublicUrl, type Article } from "../lib/articles";

const cardBase =
  "rounded-2xl overflow-hidden border bg-white shadow hover:shadow-md transition cursor-pointer";

/**
 * Pasek z trzema najnowszymi artykułami (na stronie głównej).
 * Każdy kafelek otwiera artykuł przez `onOpen(id)`.
 */
export const NewsStrip: React.FC<{
  onMore?: () => void;
  onOpen?: (id: string) => void;
}> = ({ onMore, onOpen }) => {
  const [items, setItems] = React.useState<Article[]>([]);

  React.useEffect(() => {
    listTopPublished(3).then(setItems).catch(console.error);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-2xl font-semibold">Aktualności</h2>
        {onMore && (
          <button className="text-sm underline" onClick={onMore}>
            Więcej »
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((a) => {
          const url = getPublicUrl(a.cover_path);
          return (
            <article
              key={a.id}
              className={cardBase}
              onClick={() => a.id && onOpen?.(a.id)}
            >
              {/* Kontener o stałym aspekcie + object-contain, żeby nie rozciągać logotypów/zdjęć */}
              <div className="w-full aspect-[16/9] bg-white flex items-center justify-center">
                {url ? (
                  <img
                    src={url}
                    alt={a.title}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="p-3">
                <h3 className="font-semibold leading-tight mb-1 line-clamp-2">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {a.excerpt}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
