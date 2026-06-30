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
    <section className="relative min-h-[360px] overflow-hidden rounded-3xl border border-sky-200/15 bg-slate-950 shadow-[0_24px_58px_rgba(15,23,42,0.48)] sm:min-h-[430px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_22%,rgba(56,189,248,0.38),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(14,165,233,0.28),transparent_30%),radial-gradient(circle_at_72%_72%,rgba(59,130,246,0.2),transparent_42%),linear-gradient(140deg,#020617_0%,#0b1329_36%,#0f1b3e_72%,#0b1120_100%)]" />
      <div className="absolute inset-0 opacity-35 [background-size:160px_80px] [background-image:radial-gradient(circle_at_15%_55%,rgba(186,230,253,0.2)_0,rgba(186,230,253,0.2)_1px,transparent_1px),linear-gradient(120deg,transparent_42%,rgba(125,211,252,0.16)_50%,transparent_58%)]" />
      <div className="absolute -left-16 top-20 h-44 w-44 rounded-full border border-sky-300/30 bg-sky-300/5" />
      <div className="absolute left-12 top-16 h-3 w-3 rounded-full bg-sky-100/70" />
      <div className="absolute left-20 top-28 h-2.5 w-2.5 rounded-full bg-sky-200/50" />
      <div className="absolute left-28 top-14 h-2 w-2 rounded-full bg-sky-100/60" />
      <div className="absolute right-28 bottom-24 h-3 w-3 rounded-full bg-cyan-100/55" />
      <div className="absolute right-20 bottom-16 h-2.5 w-2.5 rounded-full bg-cyan-200/50" />
      <div className="absolute right-12 bottom-26 h-2 w-2 rounded-full bg-cyan-100/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-900/72 to-slate-900/58" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />

      <div className="relative px-5 py-6 sm:px-7 sm:py-7 md:px-9 md:py-8">
        <div className="grid min-h-[300px] gap-8 pb-2 sm:min-h-[340px] md:grid-cols-[1.15fr_0.85fr] md:items-end">
        <div className="self-center text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-300 sm:text-sm">WPOLO</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">WPolo</h1>
          <p className="mt-2 text-xl font-medium text-slate-100">Portal polskiej piłki wodnej</p>
          <p className="mt-3 max-w-2xl text-sm text-slate-100/90 sm:text-base">
            Rozgrywki • Kadra Polski • Kluby • Sędziowie • Wyniki
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2.5 lg:max-w-2xl">
            {cards.map((card) => (
              <button
                key={card.label}
                onClick={card.action}
                className={card.label === "Rozgrywki"
                  ? "flex items-center gap-2 rounded-2xl border border-amber-300/70 bg-amber-500/90 px-4 py-3 text-left text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-400"
                  : "flex items-center gap-2 rounded-2xl border border-sky-200/35 bg-white/10 px-4 py-3 text-left text-sm font-medium text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-sky-200/65 hover:bg-white/18"}
              >
                <span className={card.label === "Rozgrywki"
                  ? "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-amber-300"
                  : "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/85 text-slate-950"}
                >
                  {card.icon}
                </span>
                {card.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-200/45 bg-slate-900/60 p-5 text-white shadow-[0_22px_42px_rgba(2,6,23,0.5)] backdrop-blur-md md:mb-2 md:max-w-md md:justify-self-end">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Najbliższy mecz</div>
          <div className="mt-2 text-sm text-slate-100">{nearestMatchCategory || "Rozgrywki krajowe"}</div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex w-24 flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-200/35 bg-white/12 text-sm font-semibold">
                {nearestMatch ? teamInitials(nearestMatch.home) : "WP"}
              </div>
              <div className="text-xs text-slate-100">{nearestMatch?.home || "Gospodarz"}</div>
            </div>

            <div className="text-center">
              <div className="text-xl font-semibold text-amber-300">VS</div>
            </div>

            <div className="flex w-24 flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-200/35 bg-white/12 text-sm font-semibold">
                {nearestMatch ? teamInitials(nearestMatch.away) : "WP"}
              </div>
              <div className="text-xs text-slate-100">{nearestMatch?.away || "Goście"}</div>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-sm text-slate-100">
            <div>{nearestMatch ? new Date(nearestMatch.date).toLocaleDateString("pl-PL") : "Data do potwierdzenia"}</div>
            <div className="text-amber-200">{nearestMatch?.time || "Godzina do potwierdzenia"}</div>
            <div className="line-clamp-1">{nearestMatch?.location || "Miejsce do potwierdzenia"}</div>
          </div>

          <button
            onClick={onOpenNearestMatch}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            <CalendarDays className="h-4 w-4" />
            Zobacz więcej
          </button>
        </div>
      </div>
      </div>
    </section>
  );
};
