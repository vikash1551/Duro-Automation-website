"use client";

import { ROOMS } from "@/lib/journey";
import { useJourney, scrollApi } from "@/lib/store";

export default function ProgressRail() {
  const station = useJourney((s) => s.station);
  const inPage = useJourney((s) => s.inPage);

  if (inPage) return null;

  return (
    <nav className="fixed right-5 md:right-8 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-end gap-4">
      {ROOMS.map((r, i) => {
        const active = i === station;
        return (
          <button
            key={i}
            onClick={() => scrollApi.scrollToStation?.(i)}
            className="group flex items-center gap-3 pointer-events-auto"
            aria-label={`Go to ${r.railLabel}`}
          >
            <span
              className={`text-[9px] uppercase tracking-[0.25em] transition-all duration-300 ${
                active
                  ? "text-gold opacity-100"
                  : "text-stone-300 opacity-0 group-hover:opacity-70"
              }`}
            >
              {r.railLabel}
            </span>
            <span
              className={`rounded-full transition-all duration-500 ${
                active
                  ? "h-2.5 w-2.5 bg-gold"
                  : "h-1.5 w-1.5 bg-white/40 group-hover:bg-white/80"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
