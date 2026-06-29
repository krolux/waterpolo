import React from "react";

type RosterToolbarAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type RosterToolbarProps = {
  actions: RosterToolbarAction[];
};

export const RosterToolbar: React.FC<RosterToolbarProps> = ({ actions }) => {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
          className={action.disabled ? "px-3 py-2 rounded-xl border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed text-sm" : "px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};