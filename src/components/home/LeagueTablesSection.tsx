import React from "react";
import { Crown, Shield, Star } from "lucide-react";

type Row = { club: string; played: number; points: number; balance: string };

const tables: Array<{ name: string; rows: Row[] }> = [
  {
    name: "Ekstraklasa",
    rows: [
      { club: "AZS Szczecin", played: 18, points: 42, balance: "89:54" },
      { club: "KS Warszawa", played: 18, points: 39, balance: "84:60" },
      { club: "WTS Poznań", played: 18, points: 34, balance: "72:61" },
      { club: "Legia Waterpolo", played: 18, points: 31, balance: "70:68" },
      { club: "Neptun Gdańsk", played: 18, points: 26, balance: "61:66" },
    ],
  },
  {
    name: "I Liga",
    rows: [
      { club: "MUKS Łódź", played: 16, points: 37, balance: "78:57" },
      { club: "Delfin Lublin", played: 16, points: 33, balance: "71:63" },
      { club: "WOPR Olsztyn", played: 16, points: 30, balance: "68:64" },
      { club: "Baltic Team", played: 16, points: 27, balance: "64:66" },
      { club: "Orka Rzeszów", played: 16, points: 24, balance: "59:69" },
    ],
  },
  {
    name: "Juniorzy U19",
    rows: [
      { club: "SMS Warszawa", played: 14, points: 29, balance: "66:43" },
      { club: "AZS Szczecin U19", played: 14, points: 27, balance: "61:45" },
      { club: "MKS Kraków", played: 14, points: 24, balance: "55:47" },
      { club: "Delfin Wrocław", played: 14, points: 22, balance: "53:50" },
      { club: "Aqua Team Gdynia", played: 14, points: 19, balance: "48:52" },
    ],
  },
];

export const LeagueTablesSection: React.FC = () => {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
      <div className="grid gap-4 lg:grid-cols-3">
        {tables.map((table) => (
          <article key={table.name} className="rounded-2xl border border-[#e9edf2] bg-white p-4 shadow-[0_8px_20px_rgba(2,32,71,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-base font-semibold text-[#0A1F44]">{table.name}</h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-[#e9edf2]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5faff] text-[#0A1F44]">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Klub</th>
                    <th className="px-2 py-2 font-medium">M</th>
                    <th className="px-2 py-2 font-medium">Pkt</th>
                    <th className="px-2 py-2 font-medium">Bilans</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, idx) => (
                    <tr key={row.club} className="border-t border-[#e9edf2] text-slate-700">
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2 font-medium">{row.club}</td>
                      <td className="px-2 py-2">{row.played}</td>
                      <td className="px-2 py-2">{row.points}</td>
                      <td className="px-2 py-2">{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="mt-3 rounded-lg border border-[#cde6ff] px-3 py-1.5 text-sm text-[#0A1F44] transition hover:bg-sky-50">
              Pełna tabela
            </button>
          </article>
        ))}
      </div>

      <article className="rounded-3xl border border-[#0A1F44]/15 bg-gradient-to-br from-[#0A1F44] via-[#0e2a59] to-[#0A1F44] p-5 text-slate-100 shadow-[0_16px_36px_rgba(15,23,42,0.32)]">
        <h3 className="text-lg font-semibold">Liderzy statystyk</h3>
        <p className="mt-1 text-xs text-slate-300">Kluczowe nazwiska sezonu 2026</p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-amber-300"><Crown className="h-4 w-4" /> Król strzelców</div>
            <div className="mt-1 text-sm font-semibold">Marek Nowak • AZS Szczecin</div>
            <div className="text-xs text-slate-300">58 goli</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-sky-300"><Shield className="h-4 w-4" /> Najlepszy bramkarz</div>
            <div className="mt-1 text-sm font-semibold">Adam Król • KS Warszawa</div>
            <div className="text-xs text-slate-300">74% skuteczności</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="inline-flex items-center gap-2 text-amber-300"><Star className="h-4 w-4" /> MVP sezonu</div>
            <div className="mt-1 text-sm font-semibold">Kacper Zieliński • WTS Poznań</div>
            <div className="text-xs text-slate-300">11 wyróżnień MVP</div>
          </div>
        </div>

        <button className="mt-5 rounded-lg bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-3 py-1.5 text-sm font-medium text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]">
          Więcej statystyk
        </button>
      </article>
    </section>
  );
};
