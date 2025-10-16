import React from "react";
import { listPublishedPaged, getPublicUrl, type Article } from "../lib/articles";

type Props = {
  onOpen?: (id: string) => void;
  onBack?: () => void; // „Strona główna”
};

export const ArticleList: React.FC<Props> = ({ onOpen, onBack }) => {
  const [rows, setRows] = React.useState<Article[]>([]);

  React.useEffect(() => {
    listPublishedPaged(0, 29).then(setRows).catch(console.error);
  }, []);

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow"
            onClick={() => window.dispatchEvent(new CustomEvent("goHome"))}
          >
            Strona główna
          </button>
          {onBack && (
            <button
              className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow"
              onClick={onBack}
            >
              Lista artykułów
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-600">Brak artykułów do wyświetlenia.</div>
      ) : (
        <div className="rounded-2xl p-3 sm:p-4 md:p-6 bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <h2 className="text-2xl font-semibold mb-3">Wszystkie aktualności</h2>

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
                      className="w-full h-40 object-contain bg-white"
                      alt={a.title}
                      loading="lazy"
                    />
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold mb-1 line-clamp-2">{a.title}</h3>
                    {a.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-3">{a.excerpt}</p>
                    )}
                    {/* Tagi pod zajawką (jeśli są) */}
                    {Array.isArray(a.tags) && a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.tags.map((t) => (
                          <span
                            key={`${a.id}-${t}`}
                            className="px-1.5 py-0.5 text-[11px] rounded-full border bg-white text-amber-700 border-amber-200"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
