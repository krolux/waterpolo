import React from "react";
import { LicenseStatusBadge } from "./LicenseStatusBadge";
import { LicenseStatusPopover } from "./LicenseStatusPopover";
import { getLicenseStatusMeta } from "./licenseStatusHelpers";

type LicenseStatusProps = {
  licenseValidUntil?: string;
  targetDate?: string;
  verifiedAt?: string;
  verifiedBy?: string;
};

export const LicenseStatus: React.FC<LicenseStatusProps> = ({ licenseValidUntil, targetDate, verifiedAt, verifiedBy }) => {
  const [open, setOpen] = React.useState(false);
  const tone = React.useMemo(() => getLicenseStatusMeta(licenseValidUntil, targetDate), [licenseValidUntil, targetDate]);

  return (
    <div className="relative inline-block">
      <LicenseStatusBadge label={tone.label} icon={tone.icon} className={tone.className} onClick={() => setOpen((v) => !v)} />
      {open ? <LicenseStatusPopover verifiedAt={verifiedAt} verifiedBy={verifiedBy} validUntil={licenseValidUntil} /> : null}
    </div>
  );
};