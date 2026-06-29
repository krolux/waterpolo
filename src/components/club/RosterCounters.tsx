import React from "react";
import { Badge } from "../shared/Badge";

type RosterCountersProps = {
  title: string;
  count: number;
  limit: number;
  limitReached: boolean;
  badgeText?: string;
};

export const RosterCounters: React.FC<RosterCountersProps> = ({ title, count, limit, limitReached, badgeText }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span>{title}</span>
        {badgeText ? <Badge tone="blue">{badgeText}</Badge> : null}
      </div>
      <div className={limitReached ? "text-sm font-semibold text-red-600" : "text-sm font-semibold text-slate-500"}>
        {count} / {limit}
      </div>
    </div>
  );
};