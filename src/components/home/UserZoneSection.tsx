import React from "react";
import { Bell, CalendarDays, ClipboardList, FileCheck2, GanttChartSquare, ShieldCheck, UserCheck } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";
import type { SaveRosterPayload } from "../../types/rosters";

type UserZoneSectionProps = {
  user: { name: string; role: Role; club?: string } | null;
  matches: Match[];
  savedRosters: SaveRosterPayload[];
};

function isAdmin(role: Role) {
  return String(role).includes("Admin");
}

function isClub(role: Role) {
  return isAdmin(role) || String(role).includes("Club");
}

function isReferee(role: Role) {
  return isAdmin(role) || String(role).includes("Referee");
}

function isDelegate(role: Role) {
  return isAdmin(role) || String(role).includes("Delegate");
}

function toTimestamp(match: Match) {
  const dt = new Date(`${match.date}T${match.time || "00:00"}:00`);
  return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
}

type MetricCard = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
};

const MiniCard: React.FC<MetricCard> = ({ title, value, description, icon }) => (
  <article className="rounded-2xl border border-white/15 bg-white/10 p-3 text-slate-100 backdrop-blur-sm transition hover:bg-white/15">
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-300">{title}</div>
      <span className="text-sky-200">{icon}</span>
    </div>
    <div className="mt-2 text-2xl font-semibold">{value}</div>
    <p className="mt-1 text-xs text-slate-300">{description}</p>
    <button className="mt-3 rounded-lg border border-white/20 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10">Zobacz</button>
  </article>
);

export const UserZoneSection: React.FC<UserZoneSectionProps> = ({ user, matches, savedRosters }) => {
  if (!user) return null;

  const now = Date.now();

  if (isClub(user.role) && user.club) {
    const clubMatches = matches.filter((m) => m.home === user.club || m.away === user.club);
    const upcoming = clubMatches
      .filter((m) => toTimestamp(m) >= now)
      .sort((a, b) => toTimestamp(a) - toTimestamp(b))
      .slice(0, 3);

    const pending = clubMatches.filter((m) => {
      const side = m.home === user.club ? "home" : m.away === user.club ? "away" : null;
      if (!side) return false;
      return !m.rosterByClub?.[side];
    }).length;

    const recentRosters = savedRosters
      .filter((r) => r.clubName === user.club)
      .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""))
      .slice(0, 3);

    const cards: MetricCard[] = [
      {
        title: "Najbliższe mecze",
        value: String(upcoming.length),
        description: upcoming.length ? `${new Date(upcoming[0].date).toLocaleDateString("pl-PL")} • ${upcoming[0].home} vs ${upcoming[0].away}` : "Brak zaplanowanych spotkań.",
        icon: <CalendarDays className="h-4 w-4" />,
      },
      {
        title: "Oczekujące zgłoszenia",
        value: String(pending),
        description: pending ? "Listy meczowe wymagają uzupełnienia." : "Wszystkie listy są aktualne.",
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        title: "Ostatnie listy",
        value: String(recentRosters.length),
        description: recentRosters.length ? `${new Date(recentRosters[0].savedAt).toLocaleDateString("pl-PL")} • ${recentRosters[0].mode === "match" ? "Meczowa" : "Turniejowa"}` : "Brak ostatnich zapisów.",
        icon: <FileCheck2 className="h-4 w-4" />,
      },
    ];

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-700/40 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.45)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Strefa użytkownika</h3>
          <p className="mt-1 text-sm text-slate-300">Dzień dobry, {user.club}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card) => <MiniCard key={card.title} {...card} />)}
        </div>
      </section>
    );
  }

  if (isAdmin(user.role)) {
    const missingResults = matches.filter((m) => !m.result || m.result.trim() === "").length;
    const cards: MetricCard[] = [
      {
        title: "Elementy wymagające działania",
        value: String(missingResults),
        description: missingResults ? "Mecze wymagają aktualizacji wyników." : "Brak pilnych elementów.",
        icon: <Bell className="h-4 w-4" />,
      },
      {
        title: "Oczekujące weryfikacje",
        value: String(savedRosters.length),
        description: savedRosters.length ? "Nowe zgłoszenia czekają na przegląd." : "Brak zgłoszeń do weryfikacji.",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        title: "Nowe zgłoszenia",
        value: String(savedRosters.length),
        description: "Łączna liczba zapisanych list w systemie.",
        icon: <GanttChartSquare className="h-4 w-4" />,
      },
    ];

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-700/40 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.45)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Strefa użytkownika</h3>
          <p className="mt-1 text-sm text-slate-300">Panel administratora</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card) => <MiniCard key={card.title} {...card} />)}
        </div>
      </section>
    );
  }

  if (isReferee(user.role) || isDelegate(user.role)) {
    const assigned = matches
      .filter((m) => m.delegate === user.name || m.referees.includes(user.name))
      .sort((a, b) => toTimestamp(a) - toTimestamp(b));

    const upcomingAssigned = assigned.filter((m) => toTimestamp(m) >= now).slice(0, 3);
    const delegations = assigned.filter((m) => m.delegate === user.name).slice(0, 3);
    const protocols = assigned.filter((m) => !!m.result).slice(-3).reverse();

    const cards: MetricCard[] = [
      {
        title: "Najbliższe mecze",
        value: String(upcomingAssigned.length),
        description: upcomingAssigned.length ? `${new Date(upcomingAssigned[0].date).toLocaleDateString("pl-PL")} • ${upcomingAssigned[0].home} vs ${upcomingAssigned[0].away}` : "Brak przydziałów w najbliższych dniach.",
        icon: <CalendarDays className="h-4 w-4" />,
      },
      {
        title: "Delegacje",
        value: String(delegations.length),
        description: delegations.length ? `${delegations[0].home} vs ${delegations[0].away}` : "Brak aktywnych delegacji.",
        icon: <UserCheck className="h-4 w-4" />,
      },
      {
        title: "Ostatnie protokoły",
        value: String(protocols.length),
        description: protocols.length ? `${protocols[0].home} vs ${protocols[0].away} (placeholder)` : "Brak protokołów do wyświetlenia.",
        icon: <FileCheck2 className="h-4 w-4" />,
      },
    ];

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-700/40 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.45)]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Strefa użytkownika</h3>
          <p className="mt-1 text-sm text-slate-300">Dzień dobry, {user.name}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card) => <MiniCard key={card.title} {...card} />)}
        </div>
      </section>
    );
  }

  return null;
};
