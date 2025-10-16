// src/components/ArticleView.tsx
import React from "react";
import { Article } from "../lib/articles";
import { supabase } from "../lib/supabase";
import { getPublicUrl, listArticleImages, type ArticleImage } from "../lib/articles";

export type ArticleViewProps = {
  id: string;
  onBack: () => void;         // przejście do listy artykułów
  onGoHome?: () => void;      // alternatywne (HOME) – zgodność z App.tsx
  onEdit?: () => void;
};

export const ArticleView: React.FC<ArticleViewProps> = ({ id, onBack, onGoHome, onEdit }) => {
  const [article, setArticle] = React.useState<Article | null>(null);
  const [author, setAuthor] = React.useState<{
    display_name: string;
    avatar_url?: string | null;
    author_footer?: string | null;
    bio?: string | null;
  }>({ display_name: "" });

  // Galeria zdjęć
  const [images, setImages] = React.useState<ArticleImage[]>([]);
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);

  // Załaduj artykuł
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data && !cancelled) setArticle(data as Article);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Autor (publiczny odczyt profilu)
  React.useEffect(() => {
    if (!article?.author_id) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url, author_footer, bio")
      .eq("id", article.author_id)
      .single()
      .then(({ data }) => {
        if (data) setAuthor(data as any);
      });
  }, [article?.author_id]);

  // Galeria – pobierz listę zdjęć po załadowaniu artykułu
  React.useEffect(() => {
    if (!article?.id) return;
    (async () => {
      try {
        const pics = await listArticleImages(article.id);
        setImages(pics);
      } catch (e) {
        console.warn("Nie udało się pobrać zdjęć artykułu:", e);
      }
    })();
  }, [article?.id]);

  // Lightbox – obsługa klawiatury
  React.useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i === null ? i : (i + images.length - 1) % images.length));
      if (e.key === "ArrowRight")
        setLightboxIdx((i) => (i === null ? i : (i + 1) % images.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, images.length]);

  if (!article) {
    return (
      <section className="max-w-6xl mx-auto">
        <div className="text-sm text-gray-600">Ładowanie artykułu…</div>
      </section>
    );
  }

  const cover = getPublicUrl(article.cover_path);

  const goHome = () => {
    if (onGoHome) onGoHome();
    else window.dispatchEvent(new CustomEvent("goHome"));
  };

  return (
    <section className="max-w-6xl mx-auto">
      {/* Nawigacja */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow"
            onClick={goHome}
          >
            Strona główna
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow"
            onClick={onBack}
          >
            Lista artykułów
          </button>
        </div>
        {onEdit && (
          <button
            className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            onClick={onEdit}
          >
            Edytuj
          </button>
        )}
      </div>

      {/* Kafelek artykułu */}
      <article className="rounded-2xl p-3 sm:p-4 md:p-6 bg-white/60 backdrop-blur-xl border border-white/40 shadow">
        {cover && (
          <img
            src={cover}
            alt={article.title}
            className="w-full max-h-[380px] object-contain bg-white rounded-xl mb-4"
          />
        )}

        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
        {article.excerpt && (
          <p className="text-lg text-gray-700 mb-3">{article.excerpt}</p>
        )}

        {article.content && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}

        {/* MINIATURY GALERII (pod treścią, nad tagami) */}
        {images.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-gray-700">Zdjęcia z artykułu</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((img, idx) => {
                const url = getPublicUrl(img.path);
                return (
                  <button
                    type="button"
                    key={img.id}
                    className="rounded overflow-hidden border bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    onClick={() => setLightboxIdx(idx)}
                    title="Powiększ"
                  >
                    {url && (
                      <img
                        src={url}
                        alt={`Zdjęcie ${idx + 1}`}
                        className="w-full h-24 object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tagi NA SAMYM DOLE (po treści i galerii) */}
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="mt-6">
            <div className="mb-1 text-sm font-medium text-gray-700">Tagi:</div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 text-xs rounded-full border bg-white text-amber-700 border-amber-200"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Autor */}
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
              <div className="font-semibold">
                Autor: {author.display_name || "—"}
              </div>
              {author.author_footer && (
                <div className="text-sm text-gray-700">{author.author_footer}</div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* LIGHTBOX (overlay) */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getPublicUrl(images[lightboxIdx].path)}
              alt={`Zdjęcie ${lightboxIdx + 1}`}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow bg-white"
            />

            {/* Strzałka wstecz */}
            {images.length > 1 && (
              <button
                type="button"
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow"
                onClick={() =>
                  setLightboxIdx((i) =>
                    i === null ? i : (i + images.length - 1) % images.length
                  )
                }
                aria-label="Poprzednie zdjęcie"
              >
                <span aria-hidden>&lsaquo;</span>
              </button>
            )}

            {/* Strzałka dalej */}
            {images.length > 1 && (
              <button
                type="button"
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow"
                onClick={() =>
                  setLightboxIdx((i) =>
                    i === null ? i : (i + 1) % images.length
                  )
                }
                aria-label="Następne zdjęcie"
              >
                <span aria-hidden>&rsaquo;</span>
              </button>
            )}

            {/* Zamknij */}
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white rounded-full w-8 h-8 shadow"
              onClick={() => setLightboxIdx(null)}
              aria-label="Zamknij podgląd"
              title="Zamknij (Esc)"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
