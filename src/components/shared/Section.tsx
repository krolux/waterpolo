import React, { PropsWithChildren } from 'react';

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

type SectionProps = PropsWithChildren<{ title: string; icon?: React.ReactNode; className?: string }>;

const Section: React.FC<SectionProps> = ({ title, icon, children, className }) => (
  <div
    className={clsx(
      'rounded-3xl p-4 sm:p-5 md:p-6',
      'bg-[#f8fcff]',
      'border border-[#dbeafe] shadow-[0_10px_24px_rgba(2,32,71,0.06)]',
      className
    )}
  >
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <h2 className="text-xl font-semibold text-[#061a33] md:text-2xl">{title}</h2>
    </div>
    {children}
  </div>
);

export { Section };
export type { SectionProps };
