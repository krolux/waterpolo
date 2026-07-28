import React from "react";
import { getPublicUrl, listTopPublished, type Article } from "../../lib/articles";

type NewsHighlightsProps = {
  onOpenAll: () => void;
  onOpenArticle: (id: string) => void;
};
function articleCategory(article: Article) {
  return Array.isArray(article.tags) && article.tags.length > 0 ? article.tags[0] : "Aktualności";
}

function formatDate(value?: string | null) {
  if (!value) return "Data do potwierdzenia";
  const ts = new Date(value);
  return Number.isNaN(ts.getTime()) ? "Data do potwierdzenia" : ts.toLocaleDateString("pl-PL");
}

export const NewsHighlights: React.FC<NewsHighlightsProps> = ({ onOpenAll, onOpenArticle }) => {
  const [articles, setArticles] = React.useState<Article[]>([]);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        const rows = await listTopPublished(4);
        if (!active) return;
        setArticles(rows);
      } catch {
        if (!active) return;
        setArticles([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const [featured, ...rest] = articles;

  if (!featured) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Nie opublikowano jeszcze żadnych artykułów.
        </div>
      </section>
    );
  }

  const featuredCover = getPublicUrl(featured.cover_path);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <article
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md lg:col-span-3"
          onClick={() => onOpenArticle(featured.id)}
        >
          <div className="relative h-64 w-full overflow-hidden bg-[#F6FAFF]">
            {featuredCover ? (
              <img
                src={featuredCover}
                alt={featured.title}
                className="h-[115%] w-full object-cover object-top transition-transform duration-[5000ms] ease-in-out group-hover:-translate-y-8"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#f2f7fc_0%,#e9edf2_100%)] text-sm text-slate-500">
                Brak zdjęcia artykułu
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F44]/42 via-[#0A1F44]/14 to-transparent" />
          </div>
          <div className="p-4">
            <span className="inline-flex rounded-full bg-[#058CFF]/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#036bc2]">{articleCategory(featured)}</span>
            <span className="ml-2 inline-flex rounded-full bg-[#F5B32E]/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a4a00]">Top news</span>
            <p className="text-xs text-slate-500">{formatDate(featured.published_at || featured.created_at)}</p>
            <h3 className="mt-1 text-xl font-semibold text-[#0A1F44]">{featured.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{featured.excerpt || "Brak skrótu artykułu."}</p>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onOpenArticle(featured.id);
              }}
              className="mt-4 rounded-lg bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-3 py-1.5 text-sm font-medium text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]"
            >
              Czytaj więcej
            </button>
          </div>
        </article>

      <div className="space-y-4 lg:col-span-2">
        {rest.map((item) => (
          <article
            key={item.id}
            className="group flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-200 hover:shadow-md"
            onClick={() => onOpenArticle(item.id)}
          >
            <div className="h-28 w-28 flex-none overflow-hidden">
              {getPublicUrl(item.cover_path) ? (
                <img
                  src={getPublicUrl(item.cover_path)!}
                  alt={item.title}
                  className="h-full w-full object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#f2f7fc_0%,#e9edf2_100%)] text-[11px] text-slate-500">
                  Brak zdjęcia
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs text-slate-500">{formatDate(item.published_at || item.created_at)}</p>
              <h4 className="mt-1 text-sm font-semibold text-slate-800">{item.title}</h4>
              <p className="mt-1 text-xs text-slate-600">{item.excerpt || "Brak skrótu artykułu."}</p>
            </div>
          </article>
        ))}
      </div>
      </div>
      <button
        onClick={onOpenAll}
        className="rounded-lg border border-[#cde6ff] bg-white px-4 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50"
      >
        Zobacz wszystkie aktualności
      </button>
    </section>
  );
};
