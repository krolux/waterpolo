import React from "react";

type HomeSectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({ icon, title, actionLabel, onAction }) => {
  return (
    <div className="mb-4 flex items-start justify-between gap-2 sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[#058CFF]">{icon}</span>
        <h2 className="text-lg font-semibold leading-tight text-[#0A1F44] sm:text-xl">{title}</h2>
      </div>

      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="shrink-0 text-xs font-semibold text-[#058CFF] transition hover:text-[#0A1F44] sm:text-sm"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
