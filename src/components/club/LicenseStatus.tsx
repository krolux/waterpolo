import React from "react";
import { LicenseStatusBadge } from "./LicenseStatusBadge";
import { LicenseStatusPopover } from "./LicenseStatusPopover";
import { getLicenseStatusMeta } from "./licenseStatusHelpers";

type LicenseStatusProps = {
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  validUntil?: string;
};

export const LicenseStatus: React.FC<LicenseStatusProps> = ({ verified, verifiedAt, verifiedBy, validUntil }) => {
  const [open, setOpen] = React.useState(false);
  const tone = React.useMemo(() => getLicenseStatusMeta(verified, validUntil), [verified, validUntil]);

  return (
    <div className="relative inline-block">
      <LicenseStatusBadge label={tone.label} icon={tone.icon} className={tone.className} onClick={() => setOpen((v) => !v)} />
      {open ? <LicenseStatusPopover verifiedAt={verifiedAt} verifiedBy={verifiedBy} validUntil={validUntil} /> : null}
    </div>
  );
};