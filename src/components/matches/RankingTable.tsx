import React, { useMemo } from 'react';
import { Table } from 'lucide-react';
import { Section } from '../shared/Section';

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

type Match = {
  home: string;
  away: string;
  result?: string;
  shootout?: boolean;
};

const RankingTable: React.FC<{ matches: Match[]; clubs: string[] }> = ({ matches, clubs }) => {
  const table = useMemo(() => {
    type Row = { team: string; pts: number; played: number; goalsFor: number; goalsAgainst: number };
    const stats: Record<string, Row> = {};

    // normalizacja nazw (usuwa kropki na końcu, podwójne spacje, NBSP itd.)
    const normalizeTeam = (s: string) =>
      (s || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\.+$/, "");

    const seeded =
      clubs?.length
        ? clubs
        : Array.from(new Set(matches.flatMap(m => [m.home, m.away])));

    // zainicjuj z listy klubów
    seeded.forEach(raw => {
      const name = normalizeTeam(raw);
      if (!name) return;
      stats[name] = { team: raw || name, pts: 0, played: 0, goalsFor: 0, goalsAgainst: 0 };
    });

    const ensure = (raw: string) => {
      const name = normalizeTeam(raw);
      if (!name) return null;
      if (!stats[name]) {
        stats[name] = { team: raw || name, pts: 0, played: 0, goalsFor: 0, goalsAgainst: 0 };
      }
      return name;
    };

    for (const m of matches) {
      if (!m?.result) continue;

      const home = ensure(m.home);
      const away = ensure(m.away);
      if (!home || !away) continue;

// akceptuj 10:9, 10-9, 10–9, 10—9 (z ewentualnymi spacjami)
const score = String(m.result);
const mScore = score.match(/^\s*(\d+)\s*[:\-–—]\s*(\d+)\s*$/);
if (!mScore) continue;
const a = Number(mScore[1]);
const b = Number(mScore[2]);

      const H = stats[home];
      const A = stats[away];

      H.played++; A.played++;
      H.goalsFor += a; H.goalsAgainst += b;
      A.goalsFor += b; A.goalsAgainst += a;

      if (m.shootout) {
        if (a > b) { H.pts += 2; A.pts += 1; }
        else       { A.pts += 2; H.pts += 1; }
      } else {
        if (a > b) H.pts += 3;
        else if (b > a) A.pts += 3;
      }
    }

    return Object.values(stats).sort((x, y) => {
      if (x.played === 0 && y.played === 0) return x.team.localeCompare(y.team);
      return (
        y.pts - x.pts ||
        (y.goalsFor - y.goalsAgainst) - (x.goalsFor - x.goalsAgainst) ||
        y.goalsFor - x.goalsFor ||
        x.team.localeCompare(y.team)
      );
    });
  }, [matches, clubs]);

  return (
    <Section title="Tabela wyników" icon={<Table className="w-5 h-5" />}>
      <table className="table-auto w-full text-xs sm:text-sm">
        <thead className="bg-white shadow-sm">
          <tr className="text-left border-b bg-gray-50">
            <th className="px-2 py-1 whitespace-nowrap w-[80px] text-center">Miejsce</th>
            <th className="px-2 py-1 break-words">Drużyna</th>
            <th className="px-2 py-1 whitespace-nowrap w-[70px] text-center">Pkt</th>
            <th className="px-2 py-1 whitespace-nowrap w-[70px] text-center">M</th>
            <th className="px-2 py-1 whitespace-nowrap w-[90px] text-center">B</th>
          </tr>
        </thead>
        <tbody>
          {table.map((row, i) => (
            <tr
              key={row.team}
              className={clsx(
                "border-b hover:bg-sky-50 transition-colors",
                i % 2 ? "bg-white" : "bg-slate-50/60",
                i === 0 && "!bg-amber-200",
                i === 1 && "!bg-gray-200",
                i === 2 && "!bg-orange-200"
              )}
            >
              <td className="px-2 py-1 whitespace-nowrap text-center">{i + 1}</td>
              <td className="px-2 py-1 break-words">{row.team}</td>
              <td className="px-2 py-1 whitespace-nowrap text-center">{row.pts}</td>
              <td className="px-2 py-1 whitespace-nowrap text-center">{row.played}</td>
              <td className="px-2 py-1 whitespace-nowrap text-center">{row.goalsFor}:{row.goalsAgainst}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
};

export { RankingTable };
export type { Match };
