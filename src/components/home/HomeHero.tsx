import React from "react";
import { CalendarDays, FileText, Target, Trophy, Users } from "lucide-react";
import type { Match } from "../../types/wpolo";
import { getClubLogoSignedUrl, listClubsForLogoManagement } from "../../lib/rosters";

type HomeHeroProps = {
  nearestRound: Match[];
  nearestRoundCategory?: string;
  onOpenMatches: () => void;
  onOpenResults: () => void;
  onOpenClubs: () => void;
  onOpenKtpw: () => void;
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

function normalizeClubName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function roundWeekendLabel(match: Match | null) {
  if (!match) return "Termin do potwierdzenia";
  const noteMatch = match.notes?.match(/Termin kolejki:\s*(.+?)(?:\.|$)/i);
  if (noteMatch?.[1]) return noteMatch[1].trim();
  return new Date(`${match.date}T00:00:00`).toLocaleDateString("pl-PL");
}

function matchDateLabel(match: Match) {
  if (!match.time) return `Weekend kolejki: ${roundWeekendLabel(match)}`;
  return new Date(`${match.date}T00:00:00`).toLocaleDateString("pl-PL");
}

const ClubLogo: React.FC<{ name: string; logoUrl?: string; compact?: boolean; medium?: boolean }> = ({ name, logoUrl, compact = false, medium = false }) => (
  <div
    className={`flex shrink-0 items-center justify-center border border-[#dbeafe] bg-white shadow-sm ${compact ? "h-9 w-9 rounded-xl p-1" : medium ? "h-12 w-12 rounded-xl p-1.5" : "h-14 w-14 rounded-2xl p-1.5"}`}
    role="img"
    aria-label={name}
  >
    {logoUrl ? (
      <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
    ) : (
      <span className="text-xs font-bold text-[#0A1F44]">{teamInitials(name)}</span>
    )}
  </div>
);

export const HomeHero: React.FC<HomeHeroProps> = ({
  nearestRound,
  nearestRoundCategory,
  onOpenMatches,
  onOpenResults,
  onOpenClubs,
  onOpenKtpw,
  onOpenNearestMatch,
}) => {
  const [clubLogoByName, setClubLogoByName] = React.useState<Record<string, string>>({});
  const [hoveredMatchId, setHoveredMatchId] = React.useState<string | null>(null);
  const [supportsHover, setSupportsHover] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      setSupportsHover(media.matches);
      if (!media.matches) setHoveredMatchId(null);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadClubLogos = async () => {
      try {
        const clubs = await listClubsForLogoManagement();
        const entries = await Promise.all(
          clubs.map(async (club) => {
            if (!club.logo_url) return null;
            const logoUrl = await getClubLogoSignedUrl(club.logo_url, 60 * 30);
            return logoUrl ? [normalizeClubName(club.name), logoUrl] as const : null;
          }),
        );
        if (!cancelled) {
          setClubLogoByName(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))));
        }
      } catch {
        if (!cancelled) setClubLogoByName({});
      }
    };

    void loadClubLogos();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstMatch = nearestRound[0] || null;
  const cards = [
    { label: "Rozgrywki", icon: <Trophy className="h-4 w-4" />, action: onOpenMatches },
    { label: "Wyniki", icon: <Target className="h-4 w-4" />, action: onOpenResults },
    { label: "Kluby", icon: <Users className="h-4 w-4" />, action: onOpenClubs },
    { label: "KTPW", icon: <FileText className="h-4 w-4" />, action: onOpenKtpw },
  ];

  const cardClassByLabel: Record<string, string> = {
    Rozgrywki: "flex items-center gap-2 rounded-2xl border border-transparent bg-[linear-gradient(135deg,#058CFF,#2CC0FF)] px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_18px_34px_rgba(5,140,255,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(5,140,255,0.5)]",
    Wyniki: "flex items-center gap-2 rounded-2xl border border-[rgba(5,140,255,0.22)] bg-[rgba(255,255,255,0.96)] px-4 py-3 text-left text-sm font-medium text-[#0A1F44] shadow-[0_8px_18px_rgba(2,32,71,0.12)] backdrop-blur-[8px] transition hover:-translate-y-0.5 hover:border-[rgba(5,140,255,0.42)] hover:shadow-[0_12px_22px_rgba(2,32,71,0.16)]",
    Kluby: "flex items-center gap-2 rounded-2xl border border-[#8fd2ff] bg-[linear-gradient(135deg,rgba(236,249,255,0.96),rgba(226,245,255,0.96))] px-4 py-3 text-left text-sm font-medium text-[#0A1F44] shadow-[0_8px_16px_rgba(2,32,71,0.1)] backdrop-blur-[8px] transition hover:-translate-y-0.5 hover:border-[#5fc4ff] hover:shadow-[0_12px_22px_rgba(2,32,71,0.14)]",
    KTPW: "flex items-center gap-2 rounded-2xl border border-[#F5B32E]/45 bg-[#0A1F44] px-4 py-3 text-left text-sm font-medium text-white shadow-[0_10px_18px_rgba(10,31,68,0.34)] transition hover:-translate-y-0.5 hover:border-[#F5B32E]/70 hover:shadow-[0_14px_22px_rgba(10,31,68,0.4)]",
  };

  const iconClassByLabel: Record<string, string> = {
    Rozgrywki: "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white",
    Wyniki: "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#cde6ff] bg-[#e8f4ff] text-[#058CFF]",
    Kluby: "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#9fd8ff] bg-white text-[#058CFF]",
    KTPW: "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#F5B32E]/55 bg-[#123063] text-[#F5B32E]",
  };

  return (
    <section className="relative min-h-[930px] w-full min-w-0 overflow-hidden rounded-[28px] border border-[#e9edf2] bg-white shadow-[0_12px_28px_rgba(2,32,71,0.08)] sm:min-h-[880px] md:min-h-[850px] lg:h-[540px] lg:min-h-0">
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

      <div className="relative z-10 h-full min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="grid h-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="self-center text-[#0A1F44]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#058CFF] sm:text-sm">Portal polskiej piłki wodnej</p>
            <h1 className="mt-3 text-[2rem] font-bold leading-[1.05] sm:text-5xl md:text-6xl">
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
            <div className="w-full rounded-[26px] border border-[rgba(5,140,255,0.24)] bg-[rgba(255,255,255,0.94)] p-5 text-[#0A1F44] shadow-[0_24px_60px_rgba(10,31,68,0.18)] backdrop-blur-[16px] lg:absolute lg:bottom-5 lg:right-0 lg:w-[440px]">
              <div className="-mx-5 -mt-5 mb-4 h-1 rounded-t-[26px] bg-gradient-to-r from-[#F5B32E] via-[#ffd27a] to-[#2CC0FF]" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#058CFF]">Najbliższa kolejka</div>
                  <div className="mt-1 text-sm text-[#5F6F8C]">{firstMatch ? (nearestRoundCategory || "Ekstraklasa") : "Brak zaplanowanych spotkań."}</div>
                </div>
                {firstMatch?.seriesRound ? (
                  <div className="shrink-0 rounded-full border border-[#F5B32E]/40 bg-[#F5B32E]/15 px-3 py-1 text-xs font-semibold text-[#9c6200]">
                    Kolejka {firstMatch.seriesRound}
                  </div>
                ) : null}
              </div>

              {nearestRound.length ? (
                <>
                <div className="mt-4 space-y-2 md:hidden">
                  {nearestRound.map((match) => (
                    <article key={match.id} className="rounded-2xl border border-[#dbeafe] bg-[#f7fbff]/95 p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <ClubLogo compact name={match.home} logoUrl={clubLogoByName[normalizeClubName(match.home)]} />
                        <div className="min-w-0 flex-1 text-center text-[11px] font-semibold leading-tight text-[#0A1F44]">
                          <div>{match.home}</div>
                          <div className="my-1 text-[9px] font-bold text-[#9c6200]">VS</div>
                          <div>{match.away}</div>
                        </div>
                        <ClubLogo compact name={match.away} logoUrl={clubLogoByName[normalizeClubName(match.away)]} />
                      </div>
                      <div className="mt-2 grid grid-cols-[14px_1fr] gap-x-2 gap-y-1 border-t border-[#dbeafe] pt-2 text-[10px] leading-snug text-[#5F6F8C]">
                        <CalendarDays className="h-3.5 w-3.5 text-[#058CFF]" />
                        <span>{matchDateLabel(match)}{match.time ? `, godz. ${match.time}` : ""}</span>
                        <span className="text-center text-[#058CFF]">●</span>
                        <span>{match.location || "Miejsce do potwierdzenia"}</span>
                        <span className="text-center text-[#058CFF]">◆</span>
                        <span>Sędziowie: {match.referees.filter(Boolean).join(", ") || "do wyznaczenia"}</span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="relative mt-4 hidden h-[218px] md:block" onMouseLeave={() => setHoveredMatchId(null)}>
                  {nearestRound.map((match, index) => {
                    const active = hoveredMatchId === match.id;
                    const column = index % 2;
                    const row = Math.floor(index / 2);
                    const position = active
                      ? `${row === 0 ? "top-0" : "bottom-0"} ${column === 0 ? "left-0" : "right-0"} h-[88%] w-[76%] z-20`
                      : `${row === 0 ? "top-0" : "bottom-0"} ${column === 0 ? "left-0" : "right-0"} h-[calc(50%-5px)] w-[calc(50%-5px)] z-10`;

                    return (
                      <div
                        key={match.id}
                        className={`absolute flex cursor-default flex-col overflow-hidden rounded-2xl border bg-[#f7fbff]/95 p-2 transition-[width,height,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${position} ${active ? "border-[#80cbff] bg-[linear-gradient(145deg,#ffffff,#edf8ff)] p-3 shadow-[0_16px_36px_rgba(5,140,255,0.2)]" : "border-[#e0effc] hover:border-[#8fd2ff] hover:bg-white hover:shadow-md"}`}
                        aria-label={`${match.home} – ${match.away}`}
                        onMouseEnter={() => supportsHover && setHoveredMatchId(match.id)}
                        onMouseLeave={() => setHoveredMatchId((current) => current === match.id ? null : current)}
                      >
                        <div className={`flex items-center justify-center transition-all duration-500 ${active ? "gap-3" : "h-full gap-2"}`}>
                          <div className={`flex min-w-0 items-center transition-all duration-500 ${active ? "flex-1 flex-col gap-1 text-center" : ""}`}>
                            <ClubLogo medium={active} name={match.home} logoUrl={clubLogoByName[normalizeClubName(match.home)]} />
                            <div className={`text-[10px] font-semibold leading-tight text-[#0A1F44] transition-all duration-300 ${active ? "mt-1 max-h-8 opacity-100" : "max-h-0 opacity-0"}`}>{match.home}</div>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#F5B32E]/12 px-1.5 py-1 text-[10px] font-bold text-[#9c6200]">VS</span>
                          <div className={`flex min-w-0 items-center transition-all duration-500 ${active ? "flex-1 flex-col gap-1 text-center" : ""}`}>
                            <ClubLogo medium={active} name={match.away} logoUrl={clubLogoByName[normalizeClubName(match.away)]} />
                            <div className={`text-[10px] font-semibold leading-tight text-[#0A1F44] transition-all duration-300 ${active ? "mt-1 max-h-8 opacity-100" : "max-h-0 opacity-0"}`}>{match.away}</div>
                          </div>
                        </div>

                        <div className={`mt-auto grid grid-cols-[16px_1fr] gap-x-2 gap-y-1.5 rounded-xl bg-white/90 px-2.5 text-[10px] leading-tight text-[#5F6F8C] transition-all duration-300 ${active ? "max-h-28 py-2 opacity-100 delay-150" : "max-h-0 py-0 opacity-0"}`}>
                          <CalendarDays className="h-3.5 w-3.5 text-[#058CFF]" />
                          <span>{matchDateLabel(match)}{match.time ? `, godz. ${match.time}` : ""}</span>
                          <span className="text-center text-[#058CFF]">●</span>
                          <span>{match.location || "Miejsce do potwierdzenia"}</span>
                          <span className="text-center text-[#058CFF]">◆</span>
                          <span>Sędziowie: {match.referees.filter(Boolean).join(", ") || "do wyznaczenia"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              ) : null}

              <div className="mt-4 text-sm font-medium text-[#0A1F44]">
                {firstMatch ? `Weekend kolejki: ${roundWeekendLabel(firstMatch)}` : "Termin do potwierdzenia"}
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
