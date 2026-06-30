import React from "react";
import { Flag, LayoutList, Trophy, Users } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";
import type { SaveRosterPayload } from "../../types/rosters";
import type { Tournament } from "../../lib/competitions";
import { HomeSectionHeader } from "../home/HomeSectionHeader";
import { HomeHero } from "../home/HomeHero";
import { CompetitionCenter } from "../home/CompetitionCenter";
import { NewsHighlights } from "../home/NewsHighlights";
import { NationalTeamsSection } from "../home/NationalTeamsSection";
import { LeagueTablesSection } from "../home/LeagueTablesSection";
import { ClubsShowcaseSection } from "../home/ClubsShowcaseSection";
import { UserZoneSection } from "../home/UserZoneSection";
import { HomeFooter } from "../home/HomeFooter";

type HomePortalPageProps = {
  matches: Match[];
  tournaments: Tournament[];
  effectiveUser: { name: string; role: Role; club?: string } | null;
  savedRosters: SaveRosterPayload[];
  competitionNameById?: Record<string, string>;
  tournamentNameById?: Record<string, string>;
  onOpenMatches: () => void;
  onOpenArticles: () => void;
  onOpenKtpw: () => void;
  onOpenClubPage?: () => void;
};

export const HomePortalPage: React.FC<HomePortalPageProps> = ({
  matches,
  tournaments,
  effectiveUser,
  savedRosters,
  competitionNameById,
  tournamentNameById,
  onOpenMatches,
  onOpenArticles,
  onOpenKtpw,
  onOpenClubPage,
}) => {
  const clubsRef = React.useRef<HTMLDivElement>(null);
  const nationalTeamsRef = React.useRef<HTMLDivElement>(null);
  const tablesRef = React.useRef<HTMLDivElement>(null);

  const nearestMatch = React.useMemo(() => {
    const now = Date.now();
    return matches
      .filter((match) => {
        const ts = new Date(`${match.date}T${match.time || "00:00"}:00`).getTime();
        return !Number.isNaN(ts) && ts >= now;
      })
      .sort((a, b) => {
        const left = new Date(`${a.date}T${a.time || "00:00"}:00`).getTime();
        const right = new Date(`${b.date}T${b.time || "00:00"}:00`).getTime();
        return left - right;
      })[0] || null;
  }, [matches]);

  const nearestMatchCategory = React.useMemo(() => {
    if (!nearestMatch) return "Rozgrywki krajowe";
    if (nearestMatch.competitionSeasonId && competitionNameById?.[nearestMatch.competitionSeasonId]) {
      return competitionNameById[nearestMatch.competitionSeasonId];
    }
    if (nearestMatch.tournamentId && tournamentNameById?.[nearestMatch.tournamentId]) {
      return tournamentNameById[nearestMatch.tournamentId];
    }
    return "Rozgrywki krajowe";
  }, [competitionNameById, nearestMatch, tournamentNameById]);

  const scrollToClubs = React.useCallback(() => {
    if (onOpenClubPage && effectiveUser && (String(effectiveUser.role).includes("Club") || String(effectiveUser.role).includes("Admin"))) {
      onOpenClubPage();
      return;
    }

    clubsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [effectiveUser, onOpenClubPage]);

  const scrollToNationalTeams = React.useCallback(() => {
    nationalTeamsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToTables = React.useCallback(() => {
    tablesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="space-y-10 bg-[#f7fbff] pb-6">
      <HomeHero
        nearestMatch={nearestMatch}
        nearestMatchCategory={nearestMatchCategory}
        onOpenMatches={onOpenMatches}
        onOpenResults={onOpenMatches}
        onOpenClubs={scrollToClubs}
        onOpenNationalTeams={scrollToNationalTeams}
        onOpenNearestMatch={onOpenMatches}
      />

      <section className="rounded-2xl border border-[#e5edf7] bg-white p-4 shadow-sm sm:p-5">
        <HomeSectionHeader icon={<Trophy className="h-5 w-5" />} title="Centrum rozgrywek" actionLabel="Zobacz wszystkie" onAction={onOpenMatches} />
        <CompetitionCenter matches={matches} tournaments={tournaments} onOpenMore={onOpenMatches} />
      </section>

      <section className="rounded-2xl border border-[#e5edf7] bg-white p-4 shadow-sm sm:p-5">
        <HomeSectionHeader icon={<Flag className="h-5 w-5" />} title="Aktualności" actionLabel="Zobacz wszystkie" onAction={onOpenArticles} />
        <NewsHighlights onOpenAll={onOpenArticles} />
      </section>

      <div ref={nationalTeamsRef}>
        <section className="rounded-2xl border border-[#e5edf7] bg-white p-4 shadow-sm sm:p-5">
          <HomeSectionHeader icon={<Users className="h-5 w-5" />} title="Kadra Polski" />
          <NationalTeamsSection />
        </section>
      </div>

      <section ref={tablesRef} className="rounded-2xl border border-[#e5edf7] bg-white p-4 shadow-sm sm:p-5">
        <HomeSectionHeader icon={<LayoutList className="h-5 w-5" />} title="Tabele rozgrywek" actionLabel="Zobacz wszystkie tabele" onAction={onOpenMatches} />
        <LeagueTablesSection />
      </section>

      <div ref={clubsRef}>
        <section className="rounded-2xl border border-[#e5edf7] bg-white p-4 shadow-sm sm:p-5">
          <HomeSectionHeader icon={<Users className="h-5 w-5" />} title="Kluby WPolo" actionLabel="Zobacz wszystkie kluby" onAction={onOpenClubPage || scrollToClubs} />
          <ClubsShowcaseSection onOpenClubProfile={(clubName) => {
            if (onOpenClubPage && effectiveUser?.club === clubName) {
              onOpenClubPage();
            }
          }} />
        </section>
      </div>

      <UserZoneSection user={effectiveUser} matches={matches} savedRosters={savedRosters} />

      <HomeFooter
        onOpenMatches={onOpenMatches}
        onOpenResults={onOpenMatches}
        onOpenClubs={scrollToClubs}
        onOpenNationalTeams={scrollToNationalTeams}
        onOpenKtpw={onOpenKtpw}
        onOpenArticles={onOpenArticles}
      />
    </div>
  );
};
