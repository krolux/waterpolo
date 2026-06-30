import React, { useEffect, useMemo, useState } from "react";
import {
  listKtpwDocuments,
  uploadKtpwPdf,
  insertKtpwDocument,
  deleteKtpwDocument,
  getKtpwSignedUrl,
} from "../lib/ktpw";

type KtpwDoc = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  author: string;
  date: string; // ISO
  pdfUrl?: string | null;
  pdfName?: string | null;
};

const STORAGE_KEY = "wpolo_ktpw_documents";

const CATEGORIES = [
  "Przepisy",
  "Uchwały",
  "Interpretacje",
  "Komunikaty",
  "Materiały szkoleniowe",
];

export default function Ktpw({ effectiveUser, isAdmin }: { effectiveUser?: any; isAdmin?: boolean }) {
  const [docs, setDocs] = useState<KtpwDoc[]>([]);
  const [filter, setFilter] = useState<string>("All");

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await listKtpwDocuments();
        if (!cancelled) {
          setDocs(rows.map(r => ({
            id: r.id,
            title: r.title,
            category: r.category,
            summary: r.summary,
            content: r.content,
            author: r.author,
            date: r.created_at || new Date().toISOString(),
            pdfUrl: r.pdf_url || null,
            pdfName: r.pdf_name || null,
          })));
        }
      } catch (e:any) {
        console.error('KTPW load failed', e?.message || e);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const list = filter === "All" ? docs : docs.filter(d => d.category === filter);
    return list.slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [docs, filter]);

  function clearForm() {
    setTitle("");
    setCategory(CATEGORIES[0]);
    setSummary("");
    setContent("");
    setPdfUrl("");
    setPdfFileName("");
  }

  function handlePdfUpload(file?: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Wybierz plik PDF.");
      return;
    }

    setSelectedFile(file);
    setPdfFileName(file.name);
    setPdfUrl("");
  }

  async function addDoc() {
    if (!title.trim() || !content.trim()) {
      alert("Uzupełnij tytuł i treść.");
      return;
    }

    setLoading(true);
    try {
      let storagePath: string | undefined = undefined;
      let pdf_name: string | undefined = undefined;

      if (selectedFile) {
        storagePath = await uploadKtpwPdf(selectedFile);
        pdf_name = selectedFile.name;
      } else if (pdfUrl && pdfUrl.trim()) {
        storagePath = pdfUrl.trim();
        pdf_name = pdfFileName || undefined;
      }

      await insertKtpwDocument({
        title: title.trim(),
        category,
        summary: summary.trim(),
        content: content.trim(),
        author: effectiveUser?.name || 'Anonim',
        pdf_url: storagePath || null,
        pdf_name: pdf_name || null,
      });

      // refresh
      const rows = await listKtpwDocuments();
      setDocs(rows.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        summary: r.summary,
        content: r.content,
        author: r.author,
        date: r.created_at || new Date().toISOString(),
        pdfUrl: r.pdf_url || null,
        pdfName: r.pdf_name || null,
      })));

      clearForm();
      setSelectedFile(null);
    } catch (e:any) {
      alert('Błąd zapisu: ' + (e?.message || e));
      console.error(e);
    }
    setLoading(false);
  }

  async function removeDoc(id: string) {
    if (!confirm("Usunąć wpis?")) return;
    setLoading(true);
    try {
      await deleteKtpwDocument(id);
      const rows = await listKtpwDocuments();
      setDocs(rows.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        summary: r.summary,
        content: r.content,
        author: r.author,
        date: r.created_at || new Date().toISOString(),
        pdfUrl: r.pdf_url || null,
        pdfName: r.pdf_name || null,
      })));
    } catch (e:any) {
      alert('Błąd usuwania: ' + (e?.message || e));
      console.error(e);
    }
    setLoading(false);
  }

  async function openPdf(doc: KtpwDoc) {
    if (!doc.pdfUrl) return;

    try {
      if (doc.pdfUrl.startsWith('http')) {
        window.open(doc.pdfUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // treat as storage path
      const url = await getKtpwSignedUrl(doc.pdfUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e:any) {
      console.error('Nie udało się otworzyć PDF', e);
      alert('Nie udało się otworzyć pliku PDF.');
    }
  }

  return (
    <section className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-3xl font-bold text-[#061a33]">KTPW</h2>
          <p className="text-sm text-slate-600 mt-1">
            Przepisy, uchwały, interpretacje i komunikaty Komitetu Technicznego Piłki Wodnej.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setFilter("All")}
            className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${filter === "All" ? "border-[#058CFF] bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white" : "border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50"}`}
          >
            Wszystkie
          </button>
          {CATEGORIES.map(c => (
            <button
              type="button"
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${filter === c ? "border-[#058CFF] bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] text-white" : "border-[#dbeafe] bg-white text-[#08284a] hover:bg-sky-50"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="mb-4 rounded-3xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm sm:p-5 md:p-6">
          <div className="mb-4">
            <div className="text-xl font-semibold text-[#061a33]">Dodaj wpis KTPW</div>
            <div className="text-sm text-slate-500">Dodaj uchwałę, przepis, interpretację albo komunikat. PDF możesz wgrać bezpośrednio z komputera.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="w-full px-3 py-2 rounded-xl border bg-white" placeholder="Tytuł, np. Uchwała nr 1/2026" value={title} onChange={e=>setTitle(e.target.value)} />
            <select className="w-full px-3 py-2 rounded-xl border bg-white" value={category} onChange={e=>setCategory(e.target.value)}>
              {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="w-full px-3 py-2 rounded-xl border bg-white md:col-span-2" placeholder="Krótki opis / streszczenie" value={summary} onChange={e=>setSummary(e.target.value)} />
            <textarea className="w-full px-3 py-2 rounded-xl border bg-white min-h-[140px] md:col-span-2" placeholder="Treść wpisu / najważniejsze informacje" value={content} onChange={e=>setContent(e.target.value)} />

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center rounded-xl border border-[#dbeafe] bg-white p-3">
              <div>
                <div className="text-sm font-medium">Załącznik PDF</div>
                <div className="text-xs text-slate-500">
                  {pdfFileName ? `Wybrano: ${pdfFileName}` : "Wgraj plik PDF z komputera albo wklej link poniżej."}
                </div>
              </div>
              <label className="cursor-pointer rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-center text-[#08284a] hover:bg-sky-50">
                Wybierz PDF
                <input type="file" accept="application/pdf" className="hidden" onChange={e => handlePdfUpload(e.target.files?.[0])} />
              </label>
            </div>

            <input className="w-full px-3 py-2 rounded-xl border bg-white md:col-span-2" placeholder="Alternatywnie link do PDF, np. https://..." value={pdfFileName ? pdfFileName : pdfUrl} onChange={e=>{ setPdfUrl(e.target.value); setPdfFileName(""); }} />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={addDoc} className="rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2 font-semibold text-white hover:from-[#0f99ff] hover:to-[#4acbff]">Dodaj wpis</button>
            <button onClick={clearForm} className="rounded-xl border border-[#dbeafe] bg-white px-4 py-2 text-[#08284a] hover:bg-sky-50">Wyczyść</button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-[#dbeafe] bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="text-xl font-semibold text-[#061a33]">Dokumenty KTPW</div>
          <div className="text-sm text-slate-500">{filtered.length} wpisów</div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#dbeafe] bg-[#f8fcff] p-4 text-sm text-slate-500">Brak wpisów w tej kategorii.</div>
          ) : (
            filtered.map(d => (
              <div key={d.id} className="rounded-2xl border border-[#dbeafe] bg-[#f8fcff] p-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-[#08284a]">{d.category}</span>
                      <span>{new Date(d.date).toLocaleString("pl-PL")}</span>
                      <span>Autor: {d.author}</span>
                    </div>
                    <div className="break-words text-xl font-semibold text-[#061a33]">{d.title}</div>
                    {d.summary && <div className="mt-1 text-sm text-slate-600">{d.summary}</div>}
                    <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{d.content}</div>
                    {d.pdfUrl && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => openPdf(d)}
                          className="inline-flex items-center rounded-xl border border-[#dbeafe] bg-white px-3 py-2 text-[#08284a] hover:bg-sky-50"
                        >
                          {d.pdfName ? `Otwórz PDF: ${d.pdfName}` : "Otwórz PDF"}
                        </button>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="shrink-0">
                      <button onClick={() => removeDoc(d.id)} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-red-700 hover:bg-red-50">Usuń</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
