// src/lib/articles.ts
import { supabase } from "./supabase";

/** Typ artykułu zgodny z tabelą `articles` */
export type Article = {
  id: string;
  author_id: string;
  editor_id?: string | null;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  cover_path?: string | null;
  tags: string[];
  status: "draft" | "pending" | "published" | "rejected";
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

/** Najnowsze opublikowane artykuły (do karuzeli/news strip) */
export async function listTopPublished(limit = 3): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Article[];
}

/** Stronicowana lista opublikowanych artykułów */
export async function listPublishedPaged(
  from = 0,
  to = 19
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data as Article[];
}

/** Pobierz artykuł po ID */
export async function getArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();
  // PGRST116 = not found
  if (error && error.code !== "PGRST116") throw error;
  return (data as Article) || null;
}

/** Pobierz artykuł po slug */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return (data as Article) || null;
}

/**
 * Utwórz szkic artykułu.
 * ZAWSZE ustawia author_id na aktualnego użytkownika (auth.uid()).
 */
export async function createDraft(
  partial: Partial<Article>,
  authorId?: string
): Promise<Article> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = authorId ?? auth.user?.id ?? null;
  if (!uid) {
    throw new Error(
      "Brak zalogowanego użytkownika – nie mogę utworzyć szkicu artykułu."
    );
  }

  const payload = {
    title: partial.title ?? "Bez tytułu",
    slug: partial.slug ?? null,
    excerpt: partial.excerpt ?? null,
    content: partial.content ?? null,
    cover_path: partial.cover_path ?? null,
    tags: partial.tags ?? [],
    status: "draft" as const,
    author_id: uid, // ⬅️ kluczowe: nigdy nie NULL
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Article;
}

/** Aktualizacja artykułu */
export async function updateArticle(
  id: string,
  patch: Partial<Article>
): Promise<Article> {
  const { data, error } = await supabase
    .from("articles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Article;
}

/** Zgłoś do akceptacji (redaktor) */
export async function submitForReview(id: string) {
  const { error } = await supabase
    .from("articles")
    .update({ status: "pending" })
    .eq("id", id);
  if (error) throw error;
}

/** Opublikuj (admin/editor) */
export async function publishArticle(id: string, editor_id?: string) {
  const { error } = await supabase
    .from("articles")
    .update({
      status: "published",
      editor_id: editor_id ?? null,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** Odrzuć (admin/editor) */
export async function rejectArticle(id: string) {
  const { error } = await supabase
    .from("articles")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw error;
}

/* ====== Komentarze ====== */

export type CommentRow = {
  id: string;
  article_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export async function listComments(
  articleId: string
): Promise<(CommentRow & { author_name?: string })[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, article_id, author_id, body, created_at, profiles!inner(display_name)"
    )
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id,
    article_id: r.article_id,
    author_id: r.author_id,
    body: r.body,
    created_at: r.created_at,
    author_name: r.profiles?.display_name ?? "",
  }));
}

/** Dodaj komentarz – zakładamy RLS/trigger ustawiający author_id = auth.uid() */
export async function addComment(articleId: string, body: string) {
  const { error } = await supabase
    .from("comments")
    .insert({ article_id: articleId, body });
  if (error) throw error;
}

/* ====== Storage: okładka ====== */

export async function uploadCover(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `covers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase
    .storage
    .from("article-images")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function getPublicUrl(path?: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("article-images").getPublicUrl(path);
  return data.publicUrl || null;
}
