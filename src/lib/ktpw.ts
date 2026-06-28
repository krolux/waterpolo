import { supabase } from './supabaseClient';

const BUCKET = 'ktpw-documents';

export type KtpwRow = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  author: string;
  pdf_url?: string | null; // storage path or external URL
  pdf_name?: string | null;
  created_at?: string | null;
};

export async function listKtpwDocuments() {
  const { data, error } = await supabase
    .from('ktpw_documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as KtpwRow[];
}

export async function uploadKtpwPdf(file: File) {
  const ext = file.name.split('.').pop();
  const path = `pdfs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/pdf',
  });
  if (error) throw error;
  return data?.path || path;
}

export async function insertKtpwDocument(doc: {
  title: string;
  category: string;
  summary: string;
  content: string;
  author: string;
  pdf_url?: string | null;
  pdf_name?: string | null;
}) {
  const { error, data } = await supabase.from('ktpw_documents').insert(doc).select().single();
  if (error) throw error;
  return data as KtpwRow;
}

export async function deleteKtpwDocument(id: string) {
  const { data, error } = await supabase.from('ktpw_documents').select('pdf_url').eq('id', id).maybeSingle();
  if (error) throw error;
  const storagePath = (data as any)?.pdf_url;

  const { error: derr } = await supabase.from('ktpw_documents').delete().eq('id', id);
  if (derr) throw derr;

  if (storagePath && !storagePath.startsWith('http')) {
    const { error: serr } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (serr) throw serr;
  }
}

export async function getKtpwSignedUrl(path: string, expiresInSec = 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl as string;
}
