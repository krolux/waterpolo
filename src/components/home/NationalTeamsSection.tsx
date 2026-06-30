import React from "react";

type TeamTile = {
  key: string;
  title: string;
  nextMatch: string;
  lastResult: string;
  visualClass: string;
};

const teams: TeamTile[] = [
  {
    key: "seniorzy",
    title: "Seniorzy",
    nextMatch: "Polska vs Chorwacja • 12.07.2026",
    lastResult: "Polska 11:10 Niemcy",
    visualClass: "bg-[radial-gradient(circle_at_18%_25%,rgba(56,189,248,0.45),transparent_34%),linear-gradient(145deg,#031424_0%,#0d3159_55%,#08284a_100%)]",
  },
  {
    key: "seniorki",
    title: "Seniorki",
    nextMatch: "Polska vs Węgry • 13.07.2026",
    lastResult: "Polska 9:9 Czechy",
    visualClass: "bg-[radial-gradient(circle_at_70%_22%,rgba(125,211,252,0.45),transparent_34%),linear-gradient(145deg,#061a33_0%,#164e87_52%,#08284a_100%)]",
  },
  {
    key: "juniorzy",
    title: "Juniorzy",
    nextMatch: "Polska vs Hiszpania • 20.07.2026",
    lastResult: "Polska 14:8 Litwa",
    visualClass: "bg-[radial-gradient(circle_at_26%_68%,rgba(14,165,233,0.42),transparent_36%),linear-gradient(145deg,#08284a_0%,#0f3a67_52%,#031424_100%)]",
  },
  {
    key: "juniorki",
    title: "Juniorki",
    nextMatch: "Polska vs Francja • 21.07.2026",
    lastResult: "Polska 12:11 Austria",
    visualClass: "bg-[radial-gradient(circle_at_74%_74%,rgba(56,189,248,0.4),transparent_34%),linear-gradient(145deg,#07203d_0%,#0d3159_55%,#061a33_100%)]",
  },
];

export const NationalTeamsSection: React.FC = () => {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {teams.map((team) => (
        <article key={team.key} className="overflow-hidden rounded-3xl border border-[#e9edf2] bg-white shadow-[0_8px_20px_rgba(2,32,71,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="relative">
            <div className={`h-44 w-full ${team.visualClass}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 to-transparent" />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[#0A1F44]">🇵🇱 Kadra</span>
          </div>
          <div className="space-y-2 p-4">
            <h3 className="text-lg font-semibold text-[#0A1F44]">{team.title}</h3>
            <div className="rounded-xl border border-[#e9edf2] bg-[#f8fcff] px-3 py-2 text-xs text-slate-600">
              <div className="font-medium text-slate-700">Najbliższy mecz</div>
              <div className="mt-1">{team.nextMatch}</div>
            </div>
            <div className="rounded-xl border border-[#e9edf2] bg-[#f8fcff] px-3 py-2 text-xs text-slate-600">
              <div className="font-medium text-slate-700">Ostatni wynik</div>
              <div className="mt-1">{team.lastResult}</div>
            </div>
            <button className="rounded-lg border border-[#cde6ff] px-3 py-1.5 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50">
              Więcej
            </button>
          </div>
        </article>
      ))}
    </section>
  );
};
