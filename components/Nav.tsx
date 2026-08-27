"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { useJourney, useBookingModal } from "@/lib/store";

export default function Nav({ barRef }: { barRef: RefObject<HTMLDivElement | null> }) {
  const inPage = useJourney((s) => s.inPage);
  const openBookingModal = useBookingModal((s) => s.openBookingModal);
  // Show the brand logo if public/duro-logo.png exists; otherwise fall back to
  // the text wordmark so the nav never breaks before the file is dropped in.
  const [logoOk, setLogoOk] = useState(true);
  const logoRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // catch a 404 that errored before React attached onError (hydration timing)
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) setLogoOk(false);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pointer-events-none transition-all duration-500 ${
        inPage
          ? "bg-black/95 backdrop-blur-md border-b border-white/[0.08]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      {/* progress hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/10">
        <div
          ref={barRef}
          className="h-full w-full origin-left bg-gold"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      <div className="flex items-center justify-between px-6 md:px-12 py-4 md:py-5">
        <a href="#" className="pointer-events-auto flex items-baseline gap-3 group">
          {logoOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={logoRef}
              src="/duro-logo-gold.png"
              alt="DURO Automation"
              onError={() => setLogoOk(false)}
              className="h-8 md:h-11 w-auto self-center transition-opacity duration-300 group-hover:opacity-90"
            />
          ) : (
            <>
              <span className="font-display text-2xl md:text-3xl font-semibold tracking-wide text-white group-hover:text-gold transition-colors duration-300">
                DURO
              </span>
              <span className="text-[10px] md:text-xs font-light tracking-widest2 text-gold uppercase">
                Automation
              </span>
            </>
          )}
        </a>

        <div className="flex items-center gap-4">
          <button
            onClick={openBookingModal}
            className="pointer-events-auto text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] bg-gold text-black hover:bg-goldsoft hover:shadow-[0_0_15px_rgba(200,162,95,0.4)] transition-all duration-300 rounded-full px-6 py-2.5"
          >
            Book Service
          </button>
        </div>
      </div>
    </header>
  );
}
