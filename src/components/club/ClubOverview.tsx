import React from "react";
import { FileText, Shield, Users } from "lucide-react";
import { Section } from "../shared/Section";
import type { Match, Role } from "../../types/wpolo";

type ClubOverviewProps = {
  effectiveUser: { name: string; role: Role; club?: string } | null;
  matches: Match[];
};

export const ClubOverview: React.FC<ClubOverviewProps> = ({ effectiveUser, matches }) => {
  const myClub = effectiveUser?.club?.trim() || "";

  const parseMatchDateTime = (match: Match) => new Date(`${match.date}T${match.time || "00:00"}`);

  const myClubMatches = React.useMemo(() => {
    if (!myClub) return [];
    return matches.filter(match => match.home === myClub || match.away === myClub);
  }, [matches, myClub]);

  const upcomingClubMatches = React.useMemo(() => {
    return myClubMatches
      .filter(match => !match.result || match.result.trim() === "")
      .sort((a, b) => parseMatchDateTime(a).getTime() - parseMatchDateTime(b).getTime())
      .slice(0, 5);
  }, [myClubMatches]);

  const recentResults = React.useMemo(() => {
    return myClubMatches
      .filter(match => !!match.result && match.result.trim() !== "")
      .sort((a, b) => parseMatchDateTime(b).getTime() - parseMatchDateTime(a).getTime())
      .slice(0, 5);
  }, [myClubMatches]);

  const docsStatus = React.useMemo(() => {
    if (!myClub) return [] as Array<{ match: Match; commsDone: boolean; rosterDone: boolean; reportDone: boolean }>;

    return upcomingClubMatches
      .slice()
      .sort((a, b) => parseMatchDateTime(a).getTime() - parseMatchDateTime(b).getTime())
      .map(match => ({
        match,
        commsDone: !!match.commsByClub?.[myClub],
        rosterDone: !!match.rosterByClub?.[myClub],
        reportDone: !!match.matchReport,
      }));
  }, [myClub, upcomingClubMatches]);

  const stats = React.useMemo(() => {
    const played = myClubMatches.filter(match => !!match.result && match.result.trim() !== "").length;
    const upcoming = myClubMatches.filter(match => !match.result || match.result.trim() === "").length;
    const missingDocs = docsStatus.reduce((acc, item) => acc + (item.commsDone ? 0 : 1) + (item.rosterDone ? 0 : 1) + (item.reportDone ? 0 : 1), 0);
    return { played, upcoming, missingDocs };
  }, [docsStatus, myClubMatches]);

  if (!myClub) {
    return (
      <Section title="Mój klub" icon={<Users className="w-5 h-5" />} className="bg-white/60">
        <div className="text-sm text-gray-500">Brak przypisanego klubu dla zalogowanego użytkownika.</div>
      </Section>
    );
  }

  return (
    <>
      <Section title="Najbliższe mecze" icon={<Shield className="w-5 h-5" />} className="bg-white/60">
        {upcomingClubMatches.length > 0 ? (
          <ul className="space-y-2 text-sm text-gray-700">
            {upcomingClubMatches.map(match => {
              const opponent = match.home === myClub ? match.away : match.home;
              const commsDone = !!match.commsByClub?.[myClub];
              const rosterDone = !!match.rosterByClub?.[myClub];
              const reportDone = !!match.matchReport;
              return (
                <li key={match.id} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
                  <div className="font-medium">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
                  <div className="text-xs text-gray-600">{match.time || "-"}</div>
                  <div className="text-xs text-slate-700">Przeciwnik: {opponent}</div>
                  <div className="text-xs text-gray-600">{match.location}</div>
                  <div className="text-xs text-slate-600">
                    Status dokumentów: komunikat {commsDone ? "✓" : "brak"}, skład {rosterDone ? "✓" : "brak"}, protokół {reportDone ? "✓" : "brak"}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">Brak nadchodzących meczów do wyświetlenia.</div>
        )}
      </Section>

      <Section title="Dokumenty do uzupełnienia" icon={<FileText className="w-5 h-5" />} className="bg-white/60">
        {docsStatus.length > 0 ? (
          <ul className="space-y-2 text-sm text-gray-700">
            {docsStatus.map(({ match, commsDone, rosterDone, reportDone }) => {
              const opponent = match.home === myClub ? match.away : match.home;
              return (
                <li key={match.id} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
                  <div className="font-medium">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
                  <div className="text-xs text-gray-600">{match.time || "-"}</div>
                  <div className="text-xs text-slate-700">Przeciwnik: {opponent}</div>
                  <div className="text-xs text-slate-600">
                    ✓ Komunikat: {commsDone ? "✓" : "Brak"} • ✓ Skład: {rosterDone ? "✓" : "Brak"} • ✓ Protokół: {reportDone ? "✓" : "Brak"}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">Brak dokumentów wymagających uzupełnienia.</div>
        )}
      </Section>

      <Section title="Ostatnie wyniki" icon={<Shield className="w-5 h-5" />} className="bg-white/60">
        {recentResults.length > 0 ? (
          <ul className="space-y-2 text-sm text-gray-700">
            {recentResults.map(match => {
              const opponent = match.home === myClub ? match.away : match.home;
              return (
                <li key={match.id} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
                  <div className="font-medium">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
                  <div className="text-xs text-slate-700">Przeciwnik: {opponent}</div>
                  <div className="text-xs text-slate-700">Wynik: {match.result}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">Brak wyników do wyświetlenia.</div>
        )}
      </Section>

      <Section title="Statystyki" icon={<Shield className="w-5 h-5" />} className="bg-white/60">
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
            <div className="text-xs text-gray-500">Rozegrane mecze</div>
            <div className="text-lg font-semibold text-slate-800">{stats.played}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
            <div className="text-xs text-gray-500">Nadchodzące</div>
            <div className="text-lg font-semibold text-slate-800">{stats.upcoming}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
            <div className="text-xs text-gray-500">Brakujące dokumenty</div>
            <div className="text-lg font-semibold text-slate-800">{stats.missingDocs}</div>
          </div>
        </div>
      </Section>
    </>
  );
};