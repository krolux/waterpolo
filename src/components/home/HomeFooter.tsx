import React from "react";

type HomeFooterProps = {
  onOpenMatches: () => void;
  onOpenResults: () => void;
  onOpenClubs: () => void;
  onOpenNationalTeams: () => void;
  onOpenKtpw: () => void;
  onOpenArticles: () => void;
};

export const HomeFooter: React.FC<HomeFooterProps> = ({
  onOpenMatches,
  onOpenResults,
  onOpenClubs,
  onOpenNationalTeams,
  onOpenKtpw,
  onOpenArticles,
}) => {
  return (
    <footer className="relative overflow-hidden rounded-3xl border border-[#0A1F44]/30 bg-[#0A1F44] px-6 py-8 text-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.38)]">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-size:220px_110px] [background-image:radial-gradient(circle_at_12%_50%,rgba(44,192,255,0.18)_0,rgba(44,192,255,0.18)_1px,transparent_1px),linear-gradient(120deg,transparent_44%,rgba(5,140,255,0.2)_50%,transparent_56%)]" />
      <div className="relative z-10 grid gap-8 md:grid-cols-3">
        <div>
          <img
            src="/logo.svg"
            alt="WPolo"
            className="h-12 w-auto object-contain"
          />
          <p className="mt-2 text-sm text-slate-300">Piłka wodna • Pasja • Emocje</p>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Szybkie linki</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <button onClick={onOpenMatches} className="text-left text-slate-200 transition hover:text-white">Rozgrywki</button>
            <button onClick={onOpenResults} className="text-left text-slate-200 transition hover:text-white">Wyniki</button>
            <button onClick={onOpenClubs} className="text-left text-slate-200 transition hover:text-white">Kluby</button>
            <button onClick={onOpenNationalTeams} className="text-left text-slate-200 transition hover:text-white">Kadra Polski</button>
            <button onClick={onOpenKtpw} className="text-left text-slate-200 transition hover:text-white">Sędziowie</button>
            <button onClick={onOpenArticles} className="text-left text-slate-200 transition hover:text-white">Aktualności</button>
            <button onClick={onOpenArticles} className="text-left text-slate-200 transition hover:text-white">Kontakt</button>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Partnerzy</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>PZP</li>
            <li>European Aquatics</li>
            <li>World Aquatics</li>
          </ul>
        </div>
      </div>

      <div className="relative z-10 mt-8 border-t border-slate-700 pt-4 text-xs text-slate-400">© 2025 WPolo. Wszelkie prawa zastrzeżone.</div>
    </footer>
  );
};
