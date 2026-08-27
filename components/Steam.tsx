"use client";

import { useJourney } from "@/lib/store";

/** Soft steam wisps that drift up while resting in the bathroom */
export default function Steam() {
  const room = useJourney((s) => s.room);
  const phase = useJourney((s) => s.phase);
  const inPage = useJourney((s) => s.inPage);
  const on = room === 8 && phase === "dwell" && !inPage;

  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-none overflow-hidden transition-opacity duration-[1800ms] ${
        on ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="steam-wisp"
        style={{ left: "6%", bottom: "-12%", width: "34vw", height: "34vw", animationDelay: "0s" }}
      />
      <div
        className="steam-wisp"
        style={{ left: "20%", bottom: "-18%", width: "28vw", height: "28vw", animationDelay: "3s" }}
      />
      <div
        className="steam-wisp"
        style={{ left: "1%", bottom: "-8%", width: "22vw", height: "22vw", animationDelay: "5.5s" }}
      />
    </div>
  );
}
