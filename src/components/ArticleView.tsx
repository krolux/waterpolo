// src/components/ArticleView.tsx
import React from "react";
import { Article } from "../lib/articles";
import { supabase } from "../lib/supabase";
import { getPublicUrl } from "../lib/articles";
import { listArticleImages, type ArticleImage } from "../lib/articles";

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
      .then(({ data }) => data && setAuthor(data as any));
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
    <section className="max-w-6
