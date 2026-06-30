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
        <span className="text-sky-600">{icon}</span>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>

      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="text-sm font-medium text-sky-700 transition hover:text-sky-600"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};
