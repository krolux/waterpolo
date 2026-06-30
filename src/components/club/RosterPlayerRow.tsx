import React from "react";

type RosterPlayerRowProps = {
  children: React.ReactNode;
};

export const RosterPlayerRow: React.FC<RosterPlayerRowProps> = ({ children }) => {
  return <tr className="border-t border-slate-200 align-top">{children}</tr>;
};