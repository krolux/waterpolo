import React, { useEffect, useState } from 'react';
import { listAvailableReferees } from '../../lib/availability';

const AdminAvailableReferees: React.FC<{ matchId: string }> = ({ matchId }) => {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listAvailableReferees(matchId);
        const arr: any[] = Array.isArray(rows) ? rows : [];

        const normalized = arr
          .map((r) => {
            if (typeof r === 'string') return r;
            if (r && typeof r === 'object') {
              if (typeof r.name === 'string') return r.name;
              if (typeof r.display_name === 'string') return r.display_name;
            }
            return '';
          })
          .filter((s) => typeof s === 'string' && s);

        if (!cancelled) setList(normalized);
      } catch (e: any) {
        console.warn('listAvailableReferees error:', e?.message || e);
        if (!cancelled) setList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (!list.length) return <span className="text-gray-500">–</span>;
  return <span className="text-xs">{list.join(', ')}</span>;
};

export { AdminAvailableReferees };
