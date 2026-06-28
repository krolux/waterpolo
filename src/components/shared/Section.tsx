import React, { PropsWithChildren } from 'react';

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

type SectionProps = PropsWithChildren<{ title: string; icon?: React.ReactNode; className?: string }>;

const Section: React.FC<SectionProps> = ({ title, icon, children, className }) => (
  <div
    className={clsx(
      'rounded-2xl p-3 sm:p-4 md:p-6',
      'bg-white/50 backdrop-blur-xl backdrop-saturate-150',
      'border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
      className
    )}
  >
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

export { Section };
export type { SectionProps };
