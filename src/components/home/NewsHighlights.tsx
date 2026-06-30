import React from "react";

type NewsHighlightsProps = {
  onOpenAll: () => void;
};

const newsItems = [
  {
    id: "main",
    title: "Nowy sezon rozgrywek krajowych wystartował",
    date: "30.06.2026",
    summary: "Komplet terminarzy i zasad organizacyjnych na sezon 2026/2027 jest już dostępny.",
    visualClass: "bg-[radial-gradient(circle_at_22%_28%,rgba(56,189,248,0.46),transparent_36%),radial-gradient(circle_at_76%_20%,rgba(14,165,233,0.3),transparent_30%),linear-gradient(140deg,#031424_0%,#0b2b52_45%,#07203d_100%)]",
  },
  {
    id: "n1",
    title: "Szkolenie sędziów centralnych",
    date: "28.06.2026",
    summary: "Kolejna edycja seminarium dla arbitrów i delegatów.",
    visualClass: "bg-[radial-gradient(circle_at_18%_30%,rgba(14,165,233,0.42),transparent_38%),linear-gradient(145deg,#08284a_0%,#0f3a67_52%,#0b2b52_100%)]",
  },
  {
    id: "n2",
    title: "Kadra U17 przed turniejem międzynarodowym",
    date: "27.06.2026",
    summary: "Trenerzy ogłosili szeroką kadrę i plan przygotowań.",
    visualClass: "bg-[radial-gradient(circle_at_70%_25%,rgba(125,211,252,0.4),transparent_34%),linear-gradient(145deg,#061a33_0%,#103f75_55%,#08284a_100%)]",
  },
  {
    id: "n3",
    title: "Nowe kluby dołączają do systemu",
    date: "25.06.2026",
    summary: "Rozszerzamy bazę i profile klubowe dla kolejnych ośrodków.",
    visualClass: "bg-[radial-gradient(circle_at_24%_72%,rgba(186,230,253,0.36),transparent_36%),linear-gradient(145deg,#07203d_0%,#0d3159_55%,#031424_100%)]",
  },
];

export const NewsHighlights: React.FC<NewsHighlightsProps> = ({ onOpenAll }) => {
  const [featured, ...rest] = newsItems;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:col-span-3">
        <div className={`relative h-64 w-full ${featured.visualClass}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F44]/55 via-[#0A1F44]/20 to-transparent" />
          <div className="absolute inset-0 opacity-40 [background-size:110px_54px] [background-image:radial-gradient(circle_at_15%_48%,rgba(186,230,253,0.38)_0,rgba(186,230,253,0.38)_1px,transparent_1px),linear-gradient(125deg,transparent_45%,rgba(125,211,252,0.18)_50%,transparent_56%)]" />
        </div>
        <div className="p-4">
          <span className="inline-flex rounded-full bg-[#F5B32E]/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a4a00]">Aktualności</span>
          <p className="text-xs text-slate-500">{featured.date}</p>
          <h3 className="mt-1 text-xl font-semibold text-[#0A1F44]">{featured.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{featured.summary}</p>
          <button className="mt-4 rounded-lg bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-3 py-1.5 text-sm font-medium text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]">Czytaj więcej</button>
        </div>
      </article>

      <div className="space-y-4 lg:col-span-2">
        {rest.map((item) => (
          <article key={item.id} className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`h-28 w-28 flex-none ${item.visualClass}`} />
            <div className="p-3">
              <p className="text-xs text-slate-500">{item.date}</p>
              <h4 className="mt-1 text-sm font-semibold text-slate-800">{item.title}</h4>
              <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
            </div>
          </article>
        ))}
      </div>
      </div>
      <button
        onClick={onOpenAll}
        className="rounded-lg border border-[#cde6ff] bg-white px-4 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50"
      >
        Zobacz wszystkie aktualności
      </button>
    </section>
  );
};
