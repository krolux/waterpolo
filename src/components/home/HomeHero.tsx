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

  const cardClassByLabel: Record<string, string> = {
    Rozgrywki: "flex items-center gap-2 rounded-2xl border border-transparent bg-[linear-gradient(135deg,#058CFF,#2CC0FF)] px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_18px_34px_rgba(5,140,255,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(5,140,255,0.5)]",
    Wyniki: "flex items-center gap-2 rounded-2xl border border-[rgba(5,140,255,0.22)] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-left text-sm font-medium text-[#0A1F44] shadow-[0_8px_18px_rgba(2,32,71,0.12)] backdrop-blur-[8px] transition hover:-translate-y-0.5 hover:border-[rgba(5,140,255,0.42)] hover:shadow-[0_12px_22px_rgba(2,32,71,0.16)]",
    Kluby: "flex items-center gap-2 rounded-2xl border border-[#8fd2ff] bg-[linear-gradient(135deg,rgba(236,249,255,0.96),rgba(226,245,255,0.96))] px-4 py-3 text-left text-sm font-medium text-[#0A1F44] shadow-[0_8px_16px_rgba(2,32,71,0.1)] backdrop-blur-[8px] transition hover:-translate-y-0.5 hover:border-[#5fc4ff] hover:shadow-[0_12px_22px_rgba(2,32,71,0.14)]",
    "Kadra Polski": "flex items-center gap-2 rounded-2xl border border-[#F5B32E]/45 bg-[#0A1F44] px-4 py-3 text-left text-sm font-medium text-white shadow-[0_10px_18px_rgba(10,31,68,0.34)] transition hover:-translate-y-0.5 hover:border-[#F5B32E]/70 hover:shadow-[0_14px_22px_rgba(10,31,68,0.4)]",
  };

  const iconClassByLabel: Record<string, string> = {
    Rozgrywki: "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white",
    Wyniki: "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#cde6ff] bg-[#e8f4ff] text-[#058CFF]",
    Kluby: "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#9fd8ff] bg-white text-[#058CFF]",
    "Kadra Polski": "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#F5B32E]/55 bg-[#123063] text-[#F5B32E]",
  };

  return (
    <section className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-[#e9edf2] bg-white shadow-[0_12px_28px_rgba(2,32,71,0.08)] md:min-h-[520px] lg:h-[540px] lg:min-h-0">
      <img
        src="/tlo_head.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center right" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.99)_0%,rgba(237,248,255,0.95)_30%,rgba(187,230,255,0.78)_56%,rgba(93,170,225,0.55)_74%,rgba(36,76,128,0.46)_100%)] md:bg-[linear-gradient(100deg,rgba(255,255,255,0.96)_0%,rgba(238,249,255,0.9)_30%,rgba(176,224,252,0.74)_56%,rgba(74,151,209,0.58)_74%,rgba(28,64,112,0.5)_100%)] lg:bg-[linear-gradient(100deg,rgba(255,255,255,0.94)_0%,rgba(239,249,255,0.84)_32%,rgba(167,219,250,0.72)_56%,rgba(67,139,198,0.62)_74%,rgba(20,53,98,0.58)_100%)]" />
      <div className="pointer-events-none absolute -right-14 bottom-0 h-[62%] w-[46%] rounded-tl-[220px] bg-[radial-gradient(circle_at_58%_62%,rgba(10,31,68,0.3)_0%,rgba(10,31,68,0.18)_40%,rgba(10,31,68,0.02)_78%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(0deg,rgba(5,140,255,0.2)_0%,rgba(44,192,255,0.1)_34%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 h-px bg-gradient-to-r from-transparent via-[#F5B32E]/85 to-transparent" />

      <div className="relative z-10 h-full px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid h-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="self-center text-[#0A1F44]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#058CFF] sm:text-sm">Portal polskiej piłki wodnej</p>
            <h1 className="mt-3 text-[2.2rem] font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Piłka <span className="bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] bg-clip-text text-transparent">wodna</span>
              <br />
              w <span className="bg-gradient-to-r from-[#058CFF] to-[#2CC0FF] bg-clip-text text-transparent">jednym miejscu</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base">
              Rozgrywki, wyniki, kluby, kadry narodowe i narzędzia dla polskiego środowiska water polo.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-2.5 lg:max-w-2xl">
              {cards.map((card) => (
                <button
                  key={card.label}
                  onClick={card.action}
                  className={cardClassByLabel[card.label] || cardClassByLabel.Wyniki}
                >
                  <span className={iconClassByLabel[card.label] || iconClassByLabel.Wyniki}
                  >
                    {card.icon}
                  </span>
                  {card.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-h-[260px] lg:h-full">
            <div className="w-full rounded-[26px] border border-[rgba(5,140,255,0.24)] bg-[rgba(255,255,255,0.94)] p-7 text-[#0A1F44] shadow-[0_24px_60px_rgba(10,31,68,0.18)] backdrop-blur-[16px] lg:absolute lg:bottom-5 lg:right-0 lg:w-[360px]">
              <div className="-mx-7 -mt-7 mb-4 h-1 rounded-t-[26px] bg-gradient-to-r from-[#F5B32E] via-[#ffd27a] to-[#2CC0FF]" />
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#058CFF]">Najbliższy mecz</div>
              <div className="mt-2 text-sm text-[#5F6F8C]">{nearestMatch ? (nearestMatchCategory || "Rozgrywki krajowe") : "Brak zaplanowanych spotkań."}</div>

              {nearestMatch ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex w-24 flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dbeafe] bg-[#f5fbff] text-sm font-semibold text-[#0A1F44]">
                      {teamInitials(nearestMatch.home)}
                    </div>
                    <div className="text-xs text-[#0A1F44]">{nearestMatch.home}</div>
                  </div>

                  <div className="text-center">
                    <div className="rounded-full border border-[#F5B32E]/40 bg-[#F5B32E]/20 px-2.5 py-1 text-base font-bold text-[#9c6200]">VS</div>
                  </div>

                  <div className="flex w-24 flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dbeafe] bg-[#f5fbff] text-sm font-semibold text-[#0A1F44]">
                      {teamInitials(nearestMatch.away)}
                    </div>
                    <div className="text-xs text-[#0A1F44]">{nearestMatch.away}</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-1 text-sm text-[#5F6F8C]">
                <div className="text-[#0A1F44]">{nearestMatch ? new Date(nearestMatch.date).toLocaleDateString("pl-PL") : "Data do potwierdzenia"}</div>
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
