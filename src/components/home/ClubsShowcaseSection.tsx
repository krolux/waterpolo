import React from "react";
import { listClubsForLogoManagement, getClubLogoSignedUrl } from "../../lib/rosters";

type ClubCard = {
  id: string;
  name: string;
  logoUrl: string | null;
};

type ClubsShowcaseSectionProps = {
  onOpenClubProfile?: (clubName: string) => void;
};

const placeholder =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='%23f8fbff'/><path d='M18 106 C42 90, 70 120, 98 104 C122 90, 138 106, 150 102' stroke='%23058CFF' stroke-width='4' fill='none' opacity='0.6'/><text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-family='Montserrat,Arial' font-size='16' fill='%230A1F44'>WPolo</text></svg>";

export const ClubsShowcaseSection: React.FC<ClubsShowcaseSectionProps> = ({ onOpenClubProfile }) => {
  const [clubs, setClubs] = React.useState<ClubCard[]>([]);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        const rows = await listClubsForLogoManagement();
        const withUrls = await Promise.all(
          rows.map(async (club) => {
            if (!club.logo_url) {
              return { id: club.id, name: club.name, logoUrl: null };
            }

            try {
              const signed = await getClubLogoSignedUrl(club.logo_url, 60 * 30);
              return { id: club.id, name: club.name, logoUrl: signed };
            } catch {
              return { id: club.id, name: club.name, logoUrl: null };
            }
          })
        );

        if (!active) return;
        setClubs(withUrls);
      } catch {
        if (!active) return;
        setClubs([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div className="-mx-1 overflow-x-auto pb-2 sm:mx-0 sm:overflow-visible sm:pb-0">
        <div className="flex gap-3 px-1 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4 xl:grid-cols-6">
          {clubs.length === 0 ? <div className="text-sm text-slate-500">Brak klubów do wyświetlenia.</div> : null}

          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onOpenClubProfile?.(club.name)}
              className="w-[170px] flex-none rounded-2xl border border-[#e9edf2] bg-white p-3 text-left shadow-[0_8px_20px_rgba(2,32,71,0.06)] transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
            >
              <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-[#f8fcff]">
                <img src={club.logoUrl || placeholder} alt={club.name} className="h-20 w-20 object-contain" />
              </div>
              <div className="mt-3 line-clamp-2 text-sm font-medium text-slate-700">{club.name}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="rounded-lg border border-[#cde6ff] bg-white px-4 py-2 text-sm font-medium text-[#0A1F44] transition hover:bg-sky-50"
      >
        Zobacz wszystkie kluby
      </button>
    </section>
  );
};
