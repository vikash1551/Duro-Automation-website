"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SERVICES } from "@/lib/journey";
import { useJourney } from "@/lib/store";

export default function FinaleOverlay() {
  const phase = useJourney((s) => s.phase);

  return (
    <AnimatePresence>
      {phase === "finale" && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1 }}
          className="fixed inset-0 z-30 flex items-center justify-center px-6"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/75" />

          <div className="relative max-w-3xl text-center pointer-events-auto">
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.9 }}
              className="text-[10px] md:text-[11px] uppercase tracking-widest2 text-gold mb-5"
            >
              The Complete Ecosystem
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 1 }}
              className="font-display text-5xl md:text-7xl font-medium text-white leading-[1.02]"
            >
              One home.
              <br />
              One system.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.9 }}
              className="mt-6 text-sm md:text-base font-light text-stone-200/90 max-w-xl mx-auto leading-relaxed"
            >
              Everything you just walked through — the gate, the lights, the
              climate, the curtains, the shower, the scenes — runs as one
              integrated system, designed, installed and supported by DURO
              Automation. For villas, homes, offices and hospitality spaces.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.9 }}
              className="mt-8 flex flex-wrap justify-center gap-2.5"
            >
              {SERVICES.map((svc) => (
                <span
                  key={svc}
                  className="rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-4 py-2 text-[11px] tracking-wide text-stone-100"
                >
                  {svc}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
