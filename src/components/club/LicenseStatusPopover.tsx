import React from "react";

type LicenseStatusPopoverProps = {
  verifiedAt?: string;
  verifiedBy?: string;
  validUntil?: string;
};

export const LicenseStatusPopover: React.FC<LicenseStatusPopoverProps> = ({ verifiedAt, verifiedBy, validUntil }) => {
  return (
    <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 text-xs text-gray-700 shadow-lg">
      <div><span className="font-semibold">Sprawdził:</span> {verifiedBy || "-"}</div>
      <div><span className="font-semibold">Data sprawdzenia:</span> {verifiedAt ? new Date(verifiedAt).toLocaleDateString("pl-PL") : "-"}</div>
      <div><span className="font-semibold">Ważne do:</span> {validUntil ? new Date(validUntil).toLocaleDateString("pl-PL") : "-"}</div>
    </div>
  );
};