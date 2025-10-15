// src/components/ArticleEditor.tsx
import React from "react";
import { createDraft, updateArticle, submitForReview, publishArticle, rejectArticle, uploadCover, getPublicUrl, Article } from "../lib/articles";
import { supabase } from "../lib/supabase";

type Mode = 'list'|'edit';
const cls = { input:"w-full border rounded-lg p-2", btn:"px-3 py-2 rounded-lg border bg-white hover:bg-gray-50", primary:"px-3 py-2 rounded-lg bg-amber-600 text-white" };

export const ArticleEditor: React.FC<{ isAdmin:boolean }> = ({ isAdmin }) => {
  const [mode, setMode] = React.useState<Mode>('list');
  const [rows, setRows] = React.useState<Article[]>([]);
  const [draft, setDraft] = React.useState<Partial<Article>>({ title:"" });
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);

  const reloadMine = React.useCallback(async ()=>{
    // redaktor: swoje; admin: wszystkie pending/draft
    const q = supabase.from('articles').select('*').order('updated_at',{ascending:false});
    const { data, error } = isAdmin ? await q : await q.eq('author_id', (await supabase.auth.getUser()).data.user?.id);
    if (error) { alert(error.message); return; }
    setRows(data as Article[]);
  }, [isAdmin]);

  React.useEffect(()=>{ reloadMine(); }, [reloadMine]);

  async function startNew() {
    const a = await createDraft({ title:"Nowy artykuł" });
    setDraft(a);
    setCoverUrl(getPublicUrl(a.cover_path || undefined));
    setMode('edit');
  }

  async function onUploadCover(file: File) {
    const path = await uploadCover(file);
    const upd = await updateArticle(draft!.id!, { cover_path: path });
    setDraft(upd);
    setCoverUrl(getPublicUrl(path));
  }

  async function save() {
    if (!draft?.id) return;
    const slug = (draft.slug && draft.slug.trim()) || draft.title?.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'') || null;
    const upd = await updateArticle(draft.id, {
      title: draft.title ?? '',
      slug,
      excerpt: draft.excerpt ?? null,
      content: draft.content ?? null,
      tags: draft.tags ?? [],
    });
    setDraft(upd);
    alert("Zapisano szkic.");
  }

  async function sendToReview() {
    if (!draft?.id) return;
    await save();
    await submitForReview(draft.id);
    alert("Wysłano do akceptacji.");
    setMode('list'); reloadMine();
  }

  async function adminPublish(a: Article) {
    await publishArticle(a.id, (await supabase.auth.getUser()).data.user?.id || undefined);
    reloadMine();
  }
  async function adminReject(a: Article) {
    await rejectArticle(a.id);
    reloadMine();
  }

  if (mode === 'list') {
    return (
      <section className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-semibold">Artykuły ({isAdmin ? "moderacja" : "moje"})</h2>
          <button className={cls.primary} onClick={startNew}>+ Nowy artykuł</button>
        </div>
        <div className="space-y-2">
          {rows.map(a=>(
            <div key={a.id} className="border rounded-xl p-3 bg-white flex items-center justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-gray-600">Status: {a.status} {a.published_at ? `• ${new Date(a.published_at).toLocaleDateString()}`:""}</div>
              </div>
              <div className="flex gap-2">
                <button className={cls.btn} onClick={()=>{ setDraft(a); setCoverUrl(getPublicUrl(a.cover_path||undefined)); setMode('edit'); }}>Edytuj</button>
                {isAdmin && a.status==='pending' && (
                  <>
                    <button className={cls.primary} onClick={()=>adminPublish(a)}>Publikuj</button>
                    <button className={cls.btn} onClick={()=>adminReject(a)}>Odrzuć</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {rows.length===0 && <div className="text-sm text-gray-600">Brak artykułów.</div>}
        </div>
      </section>
    );
  }

  // EDIT
  return (
    <section className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-3">Edytor artykułu</h2>

      <div className="grid gap-3">
        <input className={cls.input} placeholder="Tytuł" value={draft.title||""} onChange={e=>setDraft({...draft, title:e.target.value})}/>
        <textarea className={cls.input} placeholder="Zajawka (1–2 zdania)" rows={3} value={draft.excerpt||""} onChange={e=>setDraft({...draft, excerpt:e.target.value})}/>
        <div>
          <div className="text-sm mb-1">Okładka</div>
          {coverUrl && <img src={coverUrl} className="w-full max-h-64 object-cover rounded-lg mb-2" alt="cover"/>}
          <input type="file" accept="image/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) onUploadCover(f); }}/>
        </div>
        <textarea className={cls.input + " min-h-[260px]"} placeholder="Treść (HTML lub Markdown po konwersji)" value={draft.content||""} onChange={e=>setDraft({...draft, content:e.target.value})}/>
        <input className={cls.input} placeholder="Hasztagi (po przecinku)" value={(draft.tags||[]).join(", ")} onChange={e=>setDraft({...draft, tags: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/>
        <div className="flex gap-2">
          <button className={cls.btn} onClick={save}>Zapisz szkic</button>
          <button className={cls.primary} onClick={sendToReview}>Wyślij do akceptacji</button>
          <button className={cls.btn} onClick={()=>{ setMode('list'); reloadMine(); }}>Anuluj</button>
        </div>
      </div>
    </section>
  );
};
