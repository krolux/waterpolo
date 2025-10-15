// src/lib/articles.ts
import { supabase } from "./supabase";

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
  status: 'draft'|'pending'|'published'|'rejected';
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

export async function listTopPublished(limit = 3): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Article[];
}

export async function listPublishedPaged(from = 0, to = 19): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data as Article[];
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Article) || null;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Article) || null;
}

export async function createDraft(partial: Partial<Article>): Promise<Article> {
  const payload = {
    title: partial.title ?? 'Bez tytułu',
    excerpt: partial.excerpt ?? null,
    content: partial.content ?? null,
    tags: partial.tags ?? [],
    status: 'draft',
  };
  const { data, error } = await supabase.from('articles').insert(payload).select().single();
  if (error) throw error;
  return data as Article;
}

export async function updateArticle(id: string, patch: Partial<Article>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Article;
}

export async function submitForReview(id: string) {
  const { error } = await supabase.from('articles').update({ status: 'pending' }).eq('id', id);
  if (error) throw error;
}

export async function publishArticle(id: string, editor_id?: string) {
  const { error } = await supabase
    .from('articles')
    .update({ status: 'published', editor_id: editor_id ?? null, published_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectArticle(id: string) {
  const { error } = await supabase.from('articles').update({ status: 'rejected' }).eq('id', id);
  if (error) throw error;
}

// Comments
export type CommentRow = { id: string; article_id: string; author_id: string; body: string; created_at: string };

export async function listComments(articleId: string): Promise<(CommentRow & { author_name?: string })[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, article_id, author_id, body, created_at, profiles!inner(display_name)')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as any[]).map(r => ({
    id: r.id,
    article_id: r.article_id,
    author_id: r.author_id,
    body: r.body,
    created_at: r.created_at,
    author_name: r.profiles?.display_name ?? '',
  }));
}

export async function addComment(articleId: string, body: string) {
  const { error } = await supabase.from('comments').insert({ article_id: articleId, body });
  if (error) throw error;
}

// Storage: okładka
export async function uploadCover(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `covers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('article-images').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export function getPublicUrl(path?: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('article-images').getPublicUrl(path);
  return data.publicUrl || null;
}
