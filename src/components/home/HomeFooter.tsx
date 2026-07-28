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
    <footer className="relative overflow-hidden rounded-3xl border border-[#0A1F44]/30 bg-[#0A1F44] px-6 py-9 text-slate-200 shadow-[0_16px_36px_rgba(15,23,42,0.4)]">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-size:220px_110px] [background-image:radial-gradient(circle_at_12%_50%,rgba(44,192,255,0.2)_0,rgba(44,192,255,0.2)_1px,transparent_1px),linear-gradient(120deg,transparent_44%,rgba(5,140,255,0.24)_50%,transparent_56%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#F5B32E]/80 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:linear-gradient(180deg,rgba(44,192,255,0.15)_0%,transparent_42%,transparent_100%)]" />
      <div className="relative z-10 grid gap-9 md:grid-cols-[1.1fr_1fr_0.9fr] md:items-start">
        <div>
          <div className="relative inline-flex rounded-[24px] border border-white/20 bg-[rgba(255,255,255,0.9)] px-6 py-5 shadow-[0_14px_30px_rgba(2,32,71,0.28)] backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_28%_42%,rgba(44,192,255,0.26)_0%,rgba(44,192,255,0.1)_32%,rgba(44,192,255,0)_68%)]" />
            <img
              src="/logo.png"
              alt="WPolo"
              className="relative z-10 h-[132px] w-auto object-contain"
            />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-200">Piłka wodna • Pasja • Emocje</p>
          <p className="mt-1 text-xs text-slate-300">Portal dla ludzi w czepku urodzonych</p>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5B32E]" />
            Szybkie linki
          </div>
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
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2CC0FF]" />
            Partnerzy
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>PZP</li>
            <li>European Aquatics</li>
            <li>World Aquatics</li>
          </ul>
        </div>
      </div>

      <div className="relative z-10 mt-8 border-t border-slate-700 pt-4 text-xs text-slate-400">© 2026 WPolo. Wszelkie prawa zastrzeżone.</div>
    </footer>
  );
};
