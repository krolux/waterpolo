import React from "react";
import { listPublishedPaged, getPublicUrl, type Article } from "../lib/articles";

type Props = {
  onOpen?: (id: string) => void;
  /** powrót na stronę główną */
  onBack?: () => void;
  /** (opcjonalnie) bezpośrednie przejście do listy — jeśli nie podasz, przycisk będzie wyszarzony */
  onGoList?: () => void;
};

const shell =
  "rounded-2xl p-4 md:p-6 bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.08)]";
const cardBase =
  "rounded-2xl overflow-hidden border bg-white/80 backdrop-blur-sm hover:shadow-md transition cursor-pointer";
const imgCls =
  "w-full h-[180px] object-contain bg-white p-2 border-b";
const btn =
  "px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow whitespace-nowrap";
const btnSecondary =
  "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 whitespace-nowrap";

export const ArticleList: React.FC<Props> = ({ onOpen, onBack, onGoList }) => {
  const [rows, setRows] = React.useState<Article[]>([]);

  React.useEffect(() => {
    listPublishedPaged(0, 29).then(setRows).catch(console.error);
  }, []);

  return (
    <section className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold">Wszystkie aktualności</h2>
        <div className="flex items-center gap-2">
          {onBack && (
            <button className={btn} onClick={onBack}>
              Strona główna
            </button>
          )}
          <button
            className={btnSecondary}
            onClick={onGoList}
            disabled={!onGoList}
            aria-disabled={!onGoList}
            title={onGoList ? "Przejdź do listy artykułów" : "Jesteś na liście artykułów"}
          >
            Lista artykułów
          </button>
        </div>
      </div>

      <div className={shell}>
        {rows.length === 0 ? (
          <div className="text-sm text-gray-600">
            Brak artykułów do wyświetlenia.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((a) => {
              const url = getPublicUrl(a.cover_path);
              return (
                <article
                  key={a.id}
                  className={cardBase}
                  onClick={() => a.id && onOpen?.(a.id)}
                >
                  {url && (
                    <img
                      src={url}
                      className={imgCls}
                      alt={a.title}
                      loading="lazy"
                    />
                  )}
                  <div className="p-3">
                    <h3 className="font-semibold mb-1 line-clamp-2">{a.title}</h3>
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
        )}
      </div>
    </section>
  );
};
