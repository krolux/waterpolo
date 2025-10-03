import { supabase } from './supabaseClient';
import { DocumentRow } from '../types/docs';

const BUCKET = 'docs2';

export async function listDocuments(matchId?: string) {
  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (matchId) query = query.eq('match_id', matchId);

  const { data, error } = await query;
  if (error) throw error;
  return data as DocumentRow[];
}

export async function uploadDocument(file: File, matchId?: string) {
  const ext = file.name.split('.').pop();
  const path = `${matchId || 'general'}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  const meta: Partial<DocumentRow> = {
    match_id: matchId || null,
    kind: 'Other',
    file_name: file.name,
    content_type: file.type,
    file_size: file.size,
    storage_path: path,      // ścieżka w bucketcie (bez nazwy bucketa)
    uploaded_by: user?.id || null,
  };

  const { error: dberr } = await supabase.from('documents').insert(meta);
  if (dberr) throw dberr;

  return (data?.path as string) || path;
}

export async function getSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(id: string, path: string) {
  const { error: dberr } = await supabase.from('documents').delete().eq('id', id);
  if (dberr) throw dberr;

  const { error: serr } = await supabase.storage.from(BUCKET).remove([path]);
  if (serr) throw serr;
}
