import { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, getSignedUrl, deleteDocument } from '../lib/docs';
import { DocumentRow } from '../types/docs';
import { supabase } from '../lib/supabaseClient';

type Props = { matchId?: string };

export default function DocumentsPanel({ matchId }: Props) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setRole(data?.role || null);
      }
    });
  }, [matchId]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listDocuments(matchId);
      setDocs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    try {
      await uploadDocument(file, matchId);
      setFile(null);
      refresh();
    } catch (err) {
      alert('Upload failed');
      console.error(err);
    }
  }

  async function handleOpen(path: string) {
    try {
      const url = await getSignedUrl(path);
      window.open(url, '_blank');
    } catch (err) {
      alert('Download failed');
    }
  }

  async function handleDelete(id: string, path: string) {
    if (role !== 'Admin') return;
    if (!confirm('Na pewno usunąć dokument?')) return;
    try {
      await deleteDocument(id, path);
      refresh();
    } catch (err) {
      alert('Delete failed');
    }
  }

  return (
    <div className="p-4 border rounded-md shadow-md bg-white">
      <h2 className="font-bold mb-2">Dokumenty</h2>
      <div className="flex gap-2 mb-2">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={handleUpload} className="px-3 py-1 bg-blue-500 text-white rounded">Wyślij</button>
      </div>
      {loading ? <p>Ładowanie...</p> : (
        <ul className="space-y-1">
          {docs.map(d => (
            <li key={d.id} className="flex justify-between items-center border-b py-1">
              <span>{d.file_name}</span>
              <div className="flex gap-2">
                <button onClick={() => handleOpen(d.storage_path)} className="text-blue-600">Pobierz</button>
                {role === 'Admin' && (
                  <button onClick={() => handleDelete(d.id, d.storage_path)} className="text-red-600">Usuń</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
