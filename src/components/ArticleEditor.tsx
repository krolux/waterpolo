// src/components/ArticleEditor.tsx
import React from "react";
import {
  createDraft,
  updateArticle,
  submitForReview,
  publishArticle,
  rejectArticle,
  uploadCover,
  getPublicUrl,
  type Article,
  uploadArticleImage,
  listArticleImages,
  deleteArticleImage,
  type ArticleImage,
} from "../lib/articles";
import { supabase } from "../lib/supabase";

type Props = {
  /** null = nowy artykuł, string = edycja istniejącego */
  articleId: string | null;
  /** powrót (np. do listy lub podglądu) */
  onCancel: () => void;
  /** po zapisie/opublikowaniu — zwracamy id artykułu */
  onSaved: (id: string) => void;
};

const cls = {
  input: "w-full border rounded-lg p-2",
  btn: "px-3 py-2 rounded-lg border bg-white hover:bg-gray-50",
  primary: "px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700",
};

const MAX_IMAGES = 10;

export const ArticleEditor: React.FC<Props> = ({ articleId, onCancel, onSaved }) => {
  const [draft, setDraft] = React.useState<Partial<Article>>({ title: "" });
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  // GALERIA
  const [images, setImages] = React.useState<ArticleImage[]>([]);
  const imagesLeft = Math.max(0, MAX_IMAGES - images.length);

  // sprawdź rolę (czy Admin) — do przycisków publikacji/odrzucenia
  React.useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();
      setIsAdmin((data?.role || "").toString().includes("Admin"));
    })();
  }, []);

  // załaduj istniejący artykuł albo utwórz szkic
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (articleId) {
          const { data, error } = await supabase
            .from("articles")
            .select("*")
            .eq("id", articleId)
            .single();
          if (error) throw error;
          const a = data as Article;
          setDraft(a);
          setCoverUrl(getPublicUrl(a.cover_path || undefined));
          // pobierz zdjęcia
          const pics = await listArticleImages(a.id);
          setImages(pics);
        } else {
          const a = await createDraft({ title: "Nowy artykuł" });
          setDraft(a);
          setCoverUrl(getPublicUrl(a.cover_path || undefined));
          setImages([]);
        }
      } catch (e: any) {
        alert("Nie udało się wczytać edytora: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId]);

  function makeSlug(title?: string | null, fromSlug?: string | null) {
    const base = (fromSlug && fromSlug.trim()) || (title || "");
    return base
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function ensureDraftId() {
    if (draft?.id) return draft.id;
    const created = await createDraft({ title: draft.title || "Nowy artykuł" });
    setDraft(created);
    return created.id;
  }

  async function refreshImagesFor(id: string) {
    try {
      const pics = await listArticleImages(id);
      setImages(pics);
    } catch (e: any) {
      alert("Nie udało się odświeżyć listy zdjęć: " + e.message);
    }
  }

  async function onUploadCover(file: File) {
    try {
      const id = await ensureDraftId();
      const path = await uploadCover(file);
      const upd = await updateArticle(id, { cover_path: path });
      setDraft(upd);
      setCoverUrl(getPublicUrl(path));
    } catch (e: any) {
      alert("Błąd uploadu okładki: " + e.message);
    }
  }

  // --- upload dodatkowych zdjęć (galeria) ---
  async function onUploadImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      const currentId = await ensureDraftId();

      const toUpload = Array.from(files).slice(0, imagesLeft);
      if (toUpload.length === 0) {
        alert(`Osiągnięto limit ${MAX_IMAGES} zdjęć dla artykułu.`);
        return;
      }

      for (const f of toUpload) {
        await uploadArticleImage(currentId, f);
      }

      await refreshImagesFor(currentId);
    } catch (e: any) {
      alert("Błąd uploadu zdjęć: " + e.message);
    }
  }

  async function removeImage(img: ArticleImage) {
    if (!draft?.id) return;
    if (!confirm("Usunąć to zdjęcie z artykułu?")) return;
    try {
      // ⬇️ poprawka: funkcja oczekuje 2 argumentów (articleId, imageId)
      await deleteArticleImage(draft.id, img.id);
      await refreshImagesFor(draft.id);
    } catch (e: any) {
      alert("Nie udało się usunąć zdjęcia: " + e.message);
    }
  }

  async function save({ silent = false }: { silent?: boolean } = {}) {
    if (!draft?.title || draft.title.trim().length === 0) {
      alert("Podaj tytuł artykułu.");
      return null;
    }
    setSaving(true);
    try {
      const id = await ensureDraftId();
      const slug = makeSlug(draft.title, draft.slug || null) || null;
      const upd = await updateArticle(id, {
        title: draft.title ?? "",
        slug,
        excerpt: draft.excerpt ?? null,
        content: draft.content ?? null,
        tags: draft.tags ?? [],
      });
      setDraft(upd);
      if (!silent) alert("Zapisano szkic.");
      return id;
    } catch (e: any) {
      alert("Błąd zapisu: " + e.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendToReview() {
    const id = await save({ silent: true });
    if (!id) return;
    try {
      await submitForReview(id);
      alert("Wysłano do akceptacji.");
      onSaved(id);
    } catch (e: any) {
      alert("Błąd wysyłki do akceptacji: " + e.message);
    }
  }

  async function onPublish() {
    if (!draft?.id) return;
    try {
      await publishArticle(
        draft.id,
        (await supabase.auth.getUser()).data.user?.id || undefined
      );
      alert("Opublikowano artykuł.");
      onSaved(draft.id);
    } catch (e: any) {
      alert("Błąd publikacji: " + e.message);
    }
  }

  async function onReject() {
    if (!draft?.id) return;
    try {
      await rejectArticle(draft.id);
      alert("Odrzucono artykuł.");
      onCancel();
    } catch (e: any) {
      alert("Błąd odrzucenia: " + e.message);
    }
  }

  if (loading) {
    return (
      <section className="max-w-4xl mx-auto">
        <div className="text-sm text-gray-600">Wczytywanie edytora…</div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button className={cls.btn} onClick={onCancel}>
          ← Wróć do aktualności
        </button>
        <div className="flex gap-2">
          {isAdmin && draft.status === "pending" && (
            <>
              <button className={cls.primary} onClick={onPublish}>
                Publikuj
              </button>
              <button className={cls.btn} onClick={onReject}>
                Odrzuć
              </button>
            </>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-3">
        {draft?.id ? "Edytor artykułu" : "Nowy artykuł"}
      </h2>

      <div className="grid gap-3">
        <input
          className={cls.input}
          placeholder="Tytuł"
          value={draft.title || ""}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />

        <textarea
          className={cls.input}
          placeholder="Zajawka (1–2 zdania)"
          rows={3}
          value={draft.excerpt || ""}
          onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
        />

        <div>
          <div className="text-sm mb-1">Okładka</div>
          {coverUrl && (
            <img
              src={coverUrl}
              className="w-full max-h-64 object-contain rounded-lg mb-2 bg-white"
              alt="cover"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadCover(f);
            }}
          />
        </div>

        {/* GALERIA – dodawanie i lista miniatur */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm">
              Dodatkowe zdjęcia (max {MAX_IMAGES}):{" "}
              <span className="font-medium">{images.length}</span>
            </div>
            {draft?.id && (
              <div className="text-xs text-gray-600">Pozostało: {imagesLeft}</div>
            )}
          </div>

          <div className="mb-2">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!draft?.id || imagesLeft <= 0}
              onChange={(e) => onUploadImages(e.target.files)}
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img) => {
                const url = getPublicUrl(img.path);
                return (
                  <div
                    key={img.id}
                    className="relative rounded overflow-hidden border bg-white"
                  >
                    {url && (
                      <img
                        src={url}
                        alt="miniatura"
                        className="w-full h-24 object-cover"
                        loading="lazy"
                      />
                    )}
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded px-2 text-xs"
                      onClick={() => removeImage(img)}
                      title="Usuń zdjęcie"
                    >
                      Usuń
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <textarea
          className={cls.input + " min-h-[260px]"}
          placeholder="Treść (HTML lub Markdown po konwersji)"
          value={draft.content || ""}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        />

        <input
          className={cls.input}
          placeholder="Hasztagi (po przecinku)"
          value={(draft.tags || []).join(", ")}
          onChange={(e) =>
            setDraft({
              ...draft,
              tags: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />

        <div className="flex gap-2">
          <button
            className={cls.btn}
            disabled={saving}
            onClick={async () => {
              const id = await save();
              if (id) onSaved(id);
            }}
          >
            Zapisz szkic
          </button>

          <button
            className={cls.primary}
            disabled={saving}
            onClick={sendToReview}
          >
            Wyślij do akceptacji
          </button>

          <button className={cls.btn} onClick={onCancel}>
            Anuluj
          </button>
        </div>

        {draft?.status && (
          <div className="text-xs text-gray-600">
            Status: {draft.status}
            {draft?.published_at
              ? ` • opublikowano: ${new Date(
                  draft.published_at
                ).toLocaleDateString()}`
              : ""}
          </div>
        )}
      </div>
    </section>
  );
};
