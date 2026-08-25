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
  onOpenArticle: (id: string) => void;
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
  onOpenArticle,
  onOpenKtpw,
  onOpenClubPage,
}) => {
  const clubsRef = React.useRef<HTMLDivElement>(null);
  const nationalTeamsRef = React.useRef<HTMLDivElement>(null);
  const tablesRef = React.useRef<HTMLDivElement>(null);

  const nearestRound = React.useMemo(() => {
    const now = Date.now();
    const futureMatches = matches
      .filter((match) => {
        const ts = new Date(`${match.date}T${match.time || "00:00"}:00`).getTime();
        return !Number.isNaN(ts) && ts >= now;
      })
      .sort((a, b) => {
        const left = new Date(`${a.date}T${a.time || "00:00"}:00`).getTime();
        const right = new Date(`${b.date}T${b.time || "00:00"}:00`).getTime();
        return left - right;
      });

    const firstMatch = futureMatches[0];
    if (!firstMatch) return [];

    const competitionKey = (match: Match) => match.competitionSeasonId || match.tournamentId || "legacy";
    return futureMatches.filter((match) => {
      if (competitionKey(match) !== competitionKey(firstMatch)) return false;
      if (firstMatch.seriesRound) return match.seriesRound === firstMatch.seriesRound;
      return match.date === firstMatch.date;
    });
  }, [matches]);

  const nearestRoundCategory = React.useMemo(() => {
    const firstMatch = nearestRound[0];
    if (!firstMatch) return "Ekstraklasa";
    if (firstMatch.competitionSeasonId && competitionNameById?.[firstMatch.competitionSeasonId]) {
      return competitionNameById[firstMatch.competitionSeasonId];
    }
    if (firstMatch.tournamentId && tournamentNameById?.[firstMatch.tournamentId]) {
      return tournamentNameById[firstMatch.tournamentId];
    }
    return "Ekstraklasa";
  }, [competitionNameById, nearestRound, tournamentNameById]);

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
    <div className="space-y-8 bg-transparent pb-6">
      <HomeHero
        nearestRound={nearestRound}
        nearestRoundCategory={nearestRoundCategory}
        onOpenMatches={onOpenMatches}
        onOpenResults={onOpenMatches}
        onOpenClubs={scrollToClubs}
        onOpenNationalTeams={scrollToNationalTeams}
        onOpenNearestMatch={onOpenMatches}
      />

      <section className="rounded-3xl border border-[#e9edf2] bg-white p-4 shadow-[0_10px_24px_rgba(2,32,71,0.06)] sm:p-5">
        <HomeSectionHeader icon={<Flag className="h-5 w-5" />} title="Aktualności" actionLabel="Zobacz wszystkie" onAction={onOpenArticles} />
        <NewsHighlights onOpenAll={onOpenArticles} onOpenArticle={onOpenArticle} />
      </section>

      <section className="rounded-3xl border border-[#e9edf2] bg-white p-4 shadow-[0_10px_24px_rgba(2,32,71,0.06)] sm:p-5">
        <HomeSectionHeader icon={<Trophy className="h-5 w-5" />} title="Centrum rozgrywek" actionLabel="Zobacz wszystkie" onAction={onOpenMatches} />
        <CompetitionCenter matches={matches} tournaments={tournaments} onOpenMore={onOpenMatches} />
      </section>

      <div ref={nationalTeamsRef}>
        <section className="rounded-3xl border border-[#e9edf2] bg-white p-4 shadow-[0_10px_24px_rgba(2,32,71,0.06)] sm:p-5">
          <HomeSectionHeader icon={<Users className="h-5 w-5" />} title="Kadra Polski" />
          <NationalTeamsSection
            matches={matches}
            competitionNameById={competitionNameById}
            tournamentNameById={tournamentNameById}
            onOpenMore={onOpenMatches}
          />
        </section>
      </div>

      <section ref={tablesRef} className="rounded-3xl border border-[#e9edf2] bg-white p-4 shadow-[0_10px_24px_rgba(2,32,71,0.06)] sm:p-5">
        <HomeSectionHeader icon={<LayoutList className="h-5 w-5" />} title="Tabele rozgrywek" actionLabel="Zobacz wszystkie tabele" onAction={onOpenMatches} />
        <LeagueTablesSection
          matches={matches}
          competitionNameById={competitionNameById}
          tournamentNameById={tournamentNameById}
          onOpenMore={onOpenMatches}
        />
      </section>

      <div ref={clubsRef}>
        <section className="rounded-3xl border border-[#e9edf2] bg-white p-4 shadow-[0_10px_24px_rgba(2,32,71,0.06)] sm:p-5">
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
