import React from "react";
import { CalendarDays, Shield, Target, Trophy, Users } from "lucide-react";
import type { Match } from "../../types/wpolo";

type HomeHeroProps = {
  nearestMatch: Match | null;
  nearestMatchCategory?: string;
  onOpenMatches: () => void;
  onOpenResults: () => void;
  onOpenClubs: () => void;
  onOpenNationalTeams: () => void;
  onOpenNearestMatch: () => void;
};

function teamInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  nearestMatch,
  nearestMatchCategory,
  onOpenMatches,
  onOpenResults,
  onOpenClubs,
  onOpenNationalTeams,
  onOpenNearestMatch,
}) => {
  const cards = [
    { label: "Rozgrywki", icon: <Trophy className="h-4 w-4" />, action: onOpenMatches },
    { label: "Wyniki", icon: <Target className="h-4 w-4" />, action: onOpenResults },
    { label: "Kluby", icon: <Users className="h-4 w-4" />, action: onOpenClubs },
    { label: "Kadra Polski", icon: <Shield className="h-4 w-4" />, action: onOpenNationalTeams },
  ];

  return (
    <section className="relative min-h-[390px] overflow-hidden rounded-3xl border border-[#e9edf2] bg-white shadow-[0_12px_28px_rgba(2,32,71,0.08)] sm:min-h-[460px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(44,192,255,0.2),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(5,140,255,0.18),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f4faff_56%,#edf7ff_100%)]" />
      <div className="absolute -left-20 bottom-[-60px] h-48 w-96 rounded-[999px] border-[16px] border-[#2CC0FF]/20" />

      <div className="relative px-5 py-6 sm:px-7 sm:py-7 md:px-9 md:py-8">
        <div className="grid min-h-[320px] gap-8 pb-2 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="self-center text-[#0A1F44]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#058CFF] sm:text-sm">Portal polskiej piłki wodnej</p>
            <h1 className="mt-3 text-[2.2rem] font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Piłka wodna
              <br />
              w jednym miejscu
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base">
              Rozgrywki, wyniki, kluby, kadry narodowe i narzędzia dla polskiego środowiska water polo.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-2.5 lg:max-w-2xl">
              {cards.map((card) => (
                <button
                  key={card.label}
                  onClick={card.action}
                  className={card.label === "Rozgrywki"
                    ? "flex items-center gap-2 rounded-2xl border border-[#058CFF] bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_8px_18px_rgba(5,140,255,0.25)] transition hover:-translate-y-0.5"
                    : "flex items-center gap-2 rounded-2xl border border-[#dbeafe] bg-white px-4 py-3 text-left text-sm font-medium text-[#0A1F44] transition hover:-translate-y-0.5 hover:border-[#c9e1ff] hover:bg-sky-50"}
                >
                  <span className={card.label === "Rozgrywki"
                    ? "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white"
                    : "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f4ff] text-[#058CFF]"}
                  >
                    {card.icon}
                  </span>
                  {card.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-h-[320px] lg:min-h-[360px]">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-[#058CFF] via-[#2CC0FF] to-[#8eddff] opacity-95 shadow-[0_18px_36px_rgba(5,140,255,0.3)] sm:h-72 sm:w-72" />
            <div className="absolute right-5 top-8 h-52 w-52 rounded-full border-[14px] border-white/40" />
            <div className="absolute right-12 top-16 h-40 w-40 rounded-full border-[10px] border-[#0A1F44]/14" />
            <div className="absolute right-20 top-[114px] h-7 w-7 rounded-full bg-[#F5B32E] shadow-[0_0_0_6px_rgba(245,179,46,0.24)]" />

            <svg viewBox="0 0 560 320" className="absolute bottom-8 right-0 h-48 w-[92%] text-[#058CFF]" aria-hidden="true">
              <path d="M18 248 C92 214, 154 278, 224 242 C286 210, 340 252, 402 224 C450 204, 500 218, 544 198" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" opacity="0.28" />
              <path d="M8 276 C86 238, 150 304, 222 270 C292 236, 346 282, 416 252 C466 232, 510 242, 554 220" fill="none" stroke="#2CC0FF" strokeWidth="14" strokeLinecap="round" opacity="0.42" />
              <path d="M20 298 C92 266, 154 320, 228 292 C302 264, 360 312, 432 288 C476 274, 514 278, 552 266" fill="none" stroke="#058CFF" strokeWidth="12" strokeLinecap="round" opacity="0.58" />
            </svg>

            <svg viewBox="0 0 240 220" className="absolute right-[90px] top-[84px] h-36 w-36 text-[#0A1F44]/70" aria-hidden="true">
              <circle cx="182" cy="28" r="14" fill="currentColor" opacity="0.26" />
              <path d="M102 78 C118 58, 146 54, 166 66 C176 72, 180 88, 176 102 L160 148 C155 162, 142 170, 128 166 C114 162, 108 146, 112 132 L124 92 L102 114 C92 124, 76 126, 66 118 C56 110, 56 96, 66 88 L102 78 Z" fill="currentColor" opacity="0.24" />
              <path d="M88 154 C102 166, 122 170, 142 166" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" opacity="0.26" />
            </svg>

            <div className="absolute bottom-0 left-0 w-[88%] rounded-3xl border border-[#cfe6ff] bg-white/95 p-5 text-[#0A1F44] shadow-[0_16px_34px_rgba(2,32,71,0.15)] backdrop-blur-sm sm:w-[80%]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#058CFF]">Najbliższy mecz</div>
              <div className="mt-2 text-sm text-slate-600">{nearestMatchCategory || "Rozgrywki krajowe"}</div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex w-24 flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dbeafe] bg-[#f5fbff] text-sm font-semibold text-[#0A1F44]">
                    {nearestMatch ? teamInitials(nearestMatch.home) : "WP"}
                  </div>
                  <div className="text-xs text-slate-700">{nearestMatch?.home || "Gospodarz"}</div>
                </div>

                <div className="text-center">
                  <div className="text-xl font-bold text-[#F5B32E]">VS</div>
                </div>

                <div className="flex w-24 flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dbeafe] bg-[#f5fbff] text-sm font-semibold text-[#0A1F44]">
                    {nearestMatch ? teamInitials(nearestMatch.away) : "WP"}
                  </div>
                  <div className="text-xs text-slate-700">{nearestMatch?.away || "Goście"}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1 text-sm text-slate-700">
                <div>{nearestMatch ? new Date(nearestMatch.date).toLocaleDateString("pl-PL") : "Data do potwierdzenia"}</div>
                <div className="text-[#058CFF]">{nearestMatch?.time || "Godzina do potwierdzenia"}</div>
                <div className="line-clamp-1">{nearestMatch?.location || "Miejsce do potwierdzenia"}</div>
              </div>

              <button
                onClick={onOpenNearestMatch}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] px-4 py-2.5 text-sm font-medium text-white transition hover:from-[#0f99ff] hover:to-[#4acbff]"
              >
                <CalendarDays className="h-4 w-4" />
                Zobacz więcej
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
