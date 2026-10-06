import React from 'react';

// Names are batch-fetched once by the parent for all visible matches (avoids one query per row).
const AdminAvailableReferees: React.FC<{ names: string[] }> = ({ names }) => {
  if (!names.length) return <span className="text-gray-500">–</span>;
  return <span className="text-xs">{names.join(', ')}</span>;
};

export { AdminAvailableReferees };
