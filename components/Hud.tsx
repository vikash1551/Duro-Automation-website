"use client";

import { AnimatePresence, motion } from "framer-motion";
import { N_STOPS, ROOMS } from "@/lib/journey";
import { useJourney } from "@/lib/store";

export default function Hud() {
  const room = useJourney((s) => s.room);
  const phase = useJourney((s) => s.phase);
  const inPage = useJourney((s) => s.inPage);
  const data = ROOMS[room];
  const isHero = room === 0;

  if (inPage) return null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      <AnimatePresence mode="wait">
        {phase === "dwell" && room < N_STOPS - 1 && !data.minor && (
          <motion.div
            key={`room-${room}`}
            initial={{ opacity: 0, y: 46 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-x-0 px-6 md:px-16 ${
              isHero ? "bottom-[16vh]" : "top-1/2 -translate-y-1/2"
            }`}
          >
            <div
              className={`max-w-xl ${
                data.align === "right" ? "ml-auto text-right" : ""
              }`}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.8 }}
                className="text-[10px] md:text-[11px] uppercase tracking-widest2 text-gold mb-4"
              >
                {data.kicker}
              </motion.p>

              <h2
                className={`font-display font-medium text-white leading-[1.05] drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] ${
                  isHero
                    ? "text-5xl md:text-7xl lg:text-8xl"
                    : "text-4xl md:text-6xl"
                }`}
              >
                {data.title}
              </h2>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mt-5 text-sm md:text-base font-light leading-relaxed text-stone-200/90 max-w-md drop-shadow-[0_1px_12px_rgba(0,0,0,0.7)] inline-block"
              >
                {data.body}
              </motion.p>

              <div
                className={`mt-7 flex flex-wrap gap-2.5 ${
                  data.align === "right" ? "justify-end" : ""
                }`}
              >
                {data.chips.map((chip, i) => (
                  <motion.span
                    key={chip.label}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.65 + i * 0.16, duration: 0.55 }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 backdrop-blur-md px-4 py-2 text-[11px] tracking-wide text-stone-100"
                  >
                    <span className="chip-dot h-1.5 w-1.5 rounded-full bg-gold" />
                    {chip.label}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {phase === "dwell" && room < N_STOPS - 1 && data.minor && (
          <motion.div
            key={`minor-${room}`}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-[13vh] flex flex-col items-center text-center px-6"
          >
            <p className="text-[10px] uppercase tracking-widest2 text-gold mb-3">
              {data.kicker}
            </p>
            <h2 className="font-display font-medium text-white text-3xl md:text-5xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
              {data.title}
            </h2>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {data.chips.map((chip, i) => (
                <motion.span
                  key={chip.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.14, duration: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 backdrop-blur-md px-4 py-2 text-[11px] tracking-wide text-stone-100"
                >
                  <span className="chip-dot h-1.5 w-1.5 rounded-full bg-gold" />
                  {chip.label}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {phase === "travel" && (
          <motion.div
            key={`travel-${room}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-x-0 bottom-[9vh] flex flex-col items-center gap-3"
          >
            <span className="h-8 w-px bg-gradient-to-b from-transparent via-gold/80 to-transparent" />
            <p className="text-[10px] md:text-[11px] uppercase tracking-widest2 text-stone-200/95 drop-shadow-[0_1px_10px_rgba(0,0,0,0.8)]">
              {ROOMS[room].transition}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
