import React from "react";
import { FileText, Shield, Users } from "lucide-react";
import { Section } from "../shared/Section";
import type { Match, Role } from "../../types/wpolo";
import type { SaveRosterPayload } from "../../types/rosters";
import { DocBadge } from "../shared/DocBadge";
import { getMatchRoster } from "../../lib/rosters";

type ClubOverviewProps = {
  effectiveUser: { name: string; role: Role; club?: string } | null;
  matches: Match[];
  clubId?: string | null;
  savedRosters?: SaveRosterPayload[];
  onAddRoster?: (match: Match) => void;
};

export const ClubOverview: React.FC<ClubOverviewProps> = ({ effectiveUser, matches, clubId = null, savedRosters = [], onAddRoster }) => {
  const myClub = effectiveUser?.club?.trim() || "";
  const [persistedRosterMatchIds, setPersistedRosterMatchIds] = React.useState<Set<string>>(new Set());

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

  React.useEffect(() => {
    let active = true;
    if (!clubId) {
      setPersistedRosterMatchIds(new Set());
      return;
    }
    Promise.all(upcomingClubMatches.map(async match => ({ matchId: match.id, roster: await getMatchRoster(match.id, clubId) })))
      .then(rows => { if (active) setPersistedRosterMatchIds(new Set(rows.filter(row => row.roster?.status === "submitted").map(row => row.matchId))); })
      .catch(() => { if (active) setPersistedRosterMatchIds(new Set()); });
    return () => { active = false; };
  }, [clubId, upcomingClubMatches]);

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
        rosterDone: !!match.rosterByClub?.[myClub] || persistedRosterMatchIds.has(match.id) || savedRosters.some(roster => roster.mode === "match" && roster.matchId === match.id && roster.clubName === myClub),
        reportDone: !!match.matchReport,
      }));
  }, [myClub, persistedRosterMatchIds, savedRosters, upcomingClubMatches]);

  const stats = React.useMemo(() => {
    const played = myClubMatches.filter(match => !!match.result && match.result.trim() !== "").length;
    const upcoming = myClubMatches.filter(match => !match.result || match.result.trim() === "").length;
    const missingDocs = docsStatus.reduce((acc, item) => acc + (item.commsDone ? 0 : 1) + (item.rosterDone ? 0 : 1), 0);
    return { played, upcoming, missingDocs };
  }, [docsStatus, myClubMatches]);

  if (!myClub) {
    return (
      <Section title="Mój klub" icon={<Users className="w-5 h-5" />}>
        <div className="text-sm text-slate-500">Brak przypisanego klubu dla zalogowanego użytkownika.</div>
      </Section>
    );
  }

  return (
    <>
      <Section title="Najbliższe mecze" icon={<Shield className="w-5 h-5" />}>
        {upcomingClubMatches.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {upcomingClubMatches.map(match => {
              const opponent = match.home === myClub ? match.away : match.home;
              const commsDone = !!match.commsByClub?.[myClub];
              const rosterDone = !!match.rosterByClub?.[myClub] || persistedRosterMatchIds.has(match.id) || savedRosters.some(roster => roster.mode === "match" && roster.matchId === match.id && roster.clubName === myClub);
              const commsFile = match.commsByClub?.[myClub];
              const rosterFile = match.rosterByClub?.[myClub];
              return (
                <li key={match.id} className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2">
                  <div className="font-medium">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
                  <div className="text-xs text-slate-600">{match.time || "-"}</div>
                  <div className="text-xs text-slate-700">Przeciwnik: {opponent}</div>
                  <div className="text-xs text-gray-600">{match.location}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={commsDone ? "font-semibold text-green-700" : "font-semibold text-red-600"}>Komunikat: {commsDone ? "dodany" : "brak"}</span>
                    <span className={rosterDone ? "font-semibold text-green-700" : "font-semibold text-red-600"}>Skład: {rosterDone ? "dodany" : "brak składu"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {commsFile ? <DocBadge file={commsFile} label="Otwórz komunikat" /> : null}
                    {rosterFile ? <DocBadge file={rosterFile} label="Otwórz skład" /> : null}
                    {onAddRoster ? <button type="button" onClick={() => onAddRoster(match)} className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600">{rosterDone ? "Edytuj skład" : "Dodaj skład"}</button> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">Brak nadchodzących meczów do wyświetlenia.</div>
        )}
      </Section>

      <Section title="Dokumenty do uzupełnienia" icon={<FileText className="w-5 h-5" />}>
        {docsStatus.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {docsStatus.map(({ match, commsDone, rosterDone }) => {
              const opponent = match.home === myClub ? match.away : match.home;
              return (
                <li key={match.id} className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2">
                  <div className="font-medium">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
                  <div className="text-xs text-slate-600">{match.time || "-"}</div>
                  <div className="text-xs text-slate-700">Przeciwnik: {opponent}</div>
                  <div className="text-xs text-slate-600">
                    <span className={commsDone ? "text-green-700" : "text-red-600"}>Komunikat: {commsDone ? "dodany" : "brak"}</span>
                    <span className="mx-1">•</span>
                    <span className={rosterDone ? "text-green-700" : "text-red-600"}>Skład: {rosterDone ? "dodany" : "brak składu"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">Brak dokumentów wymagających uzupełnienia.</div>
        )}
      </Section>

      <Section title="Ostatnie wyniki" icon={<Shield className="w-5 h-5" />}>
        {recentResults.length > 0 ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {recentResults.map(match => {
              const opponent = match.home === myClub ? match.away : match.home;
              return (
                <li key={match.id} className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2">
                  <div className="font-medium">{new Date(match.date).toLocaleDateString("pl-PL")}</div>
                  <div className="text-xs text-slate-700">Przeciwnik: {opponent}</div>
                  <div className="text-xs text-slate-700">Wynik: {match.result}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">Brak wyników do wyświetlenia.</div>
        )}
      </Section>

      <Section title="Statystyki" icon={<Shield className="w-5 h-5" />}>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2">
            <div className="text-xs text-slate-500">Rozegrane mecze</div>
            <div className="text-lg font-semibold text-slate-800">{stats.played}</div>
          </div>
          <div className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2">
            <div className="text-xs text-slate-500">Nadchodzące</div>
            <div className="text-lg font-semibold text-slate-800">{stats.upcoming}</div>
          </div>
          <div className="rounded-xl border border-[#dbeafe] bg-white px-3 py-2">
            <div className="text-xs text-slate-500">Brakujące dokumenty</div>
            <div className="text-lg font-semibold text-slate-800">{stats.missingDocs}</div>
          </div>
        </div>
      </Section>
    </>
  );
};
