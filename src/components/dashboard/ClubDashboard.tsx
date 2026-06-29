import React from "react";
import { ClubOverview } from "../club/ClubOverview";
import { mockPlayers } from "../club/mockPlayers";
import { PlayerTable } from "../club/PlayerTable";
import { RosterPanel } from "../club/RosterPanel";
import { Section } from "../shared/Section";
import { Users } from "lucide-react";
import type { Match, Role } from "../../types/wpolo";

type ClubDashboardProps = {
  effectiveUser: { name: string; role: Role; club?: string } | null;
  matches: Match[];
  penaltiesByMatch: Map<string, { home: { id: string; name: string }[]; away: { id: string; name: string }[] }>;
};

export const ClubDashboard: React.FC<ClubDashboardProps> = ({
  effectiveUser,
  matches,
  penaltiesByMatch: _penaltiesByMatch,
}) => {
  return (
    <div className="space-y-4">
      <ClubOverview effectiveUser={effectiveUser} matches={matches} />

      <Section title="Lista startowa" icon={<Users className="w-5 h-5" />} className="bg-white/60">
        <RosterPanel players={mockPlayers} />
      </Section>

      <Section title="Zawodnicy" icon={<Users className="w-5 h-5" />} className="bg-white/60">
        <PlayerTable players={mockPlayers} />
      </Section>
    </div>
  );
};
