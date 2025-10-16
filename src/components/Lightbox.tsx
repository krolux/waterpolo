// src/components/Lightbox.tsx
import React from "react";

type Props = {
  urls: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Lightbox({ urls, index, onClose, onPrev, onNext }: Props) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const url = urls[index];

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-[92vw] max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt="" className="w-full h-full object-contain rounded-xl bg-black" />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-white text-black rounded-full px-3 py-1 shadow"
          aria-label="Zamknij"
        >
          ✕
        </button>
        <button
          onClick={onPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black rounded-full px-3 py-2 shadow"
          aria-label="Poprzednie"
        >
          ‹
        </button>
        <button
          onClick={onNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black rounded-full px-3 py-2 shadow"
          aria-label="Następne"
        >
          ›
        </button>
      </div>
    </div>
  );
}
