"use client";

import { useJourney } from "@/lib/store";

export default function ScrollHint() {
  const started = useJourney((s) => s.started);
  const loaded = useJourney((s) => s.loaded);

  return (
    <div
      className={`fixed bottom-7 inset-x-0 z-20 flex flex-col items-center gap-3 pointer-events-none transition-opacity duration-700 ${
        loaded && !started ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-9 w-[22px] rounded-full border border-white/40 flex justify-center pt-1.5">
        <span className="hint-dot h-1.5 w-1.5 rounded-full bg-gold" />
      </div>
      <p className="text-[9px] uppercase tracking-widest2 text-stone-300">
        Scroll to walk through
      </p>
    </div>
  );
}
