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
      <div className="relative px-5 py-6 sm:px-7 sm:py-7 md:px-9 md:py-8">
        <div className="grid min-h-[320px] gap-8 pb-2 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
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
            <div className="flex h-full items-center justify-end">
              <img
                src="/tlo_head.png"
                alt="Ilustracja piłki wodnej"
                className="h-full max-h-[360px] w-full max-w-[620px] object-contain"
                style={{ objectPosition: "center right" }}
              />
            </div>

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
