import React from 'react';

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

const Badge: React.FC<{ children: React.ReactNode; tone?: 'gray' | 'green' | 'blue' | 'amber' }> = ({ children, tone = 'gray' }) => (
  <span
    className={clsx(
      'px-2 py-0.5 rounded-full text-xs font-medium border',
      tone === 'gray' && 'bg-gray-50 border-gray-200 text-gray-700',
      tone === 'green' && 'bg-green-50 border-green-200 text-green-700',
      tone === 'blue' && 'bg-blue-50 border-blue-200 text-blue-700',
      tone === 'amber' && 'bg-amber-50 border-amber-200 text-amber-700'
    )}
  >
    {children}
  </span>
);

export { Badge };
