import React from "react";

type HomeSectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({ icon, title, actionLabel, onAction }) => {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[#058CFF]">{icon}</span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sekcja</div>
          <h2 className="text-xl font-semibold text-[#0A1F44]">{title}</h2>
        </div>
      </div>

      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="text-sm font-semibold text-[#058CFF] transition hover:text-[#0A1F44]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
