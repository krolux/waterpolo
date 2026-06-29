import React from "react";

type LicenseStatusBadgeProps = {
  label: string;
  icon: string;
  className: string;
  onClick: () => void;
};

export const LicenseStatusBadge: React.FC<LicenseStatusBadgeProps> = ({ label, icon, className, onClick }) => {
  return (
    <button type="button" onClick={onClick} className={`text-sm ${className}`}>
      {icon} {label}
    </button>
  );
};