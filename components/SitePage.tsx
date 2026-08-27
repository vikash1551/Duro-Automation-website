"use client";

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import SmartHomeController from "./SmartHomeController";

const SERVICES = [
  {
    name: "Smart Home Automation",
    body: "One unified system connecting lighting, climate, entertainment, curtains, appliances and security — controlled from a single touch.",
  },
  {
    name: "Lighting Automation",
    body: "Schedules, motion and occupancy sensing, dimming and scene control for indoor and outdoor lighting.",
  },
  {
    name: "Climate Control",
    body: "Air conditioning, ventilation and environment controls tuned for comfort and energy efficiency.",
  },
  {
    name: "Smart Security",
    body: "Smart locks, CCTV, AI cameras, motion sensors, video doorbells and alarms with real-time remote monitoring.",
  },
  {
    name: "Access Control",
    body: "Biometric systems, RFID, digital access and remote authorisation for secure entry and exit.",
  },
  {
    name: "Voice Control",
    body: "Natural voice commands through Alexa, Google Assistant and Apple HomeKit where applicable.",
  },
  {
    name: "Curtains & Blinds",
    body: "Automated shades responding to schedules, sunlight, occupancy or a single command.",
  },
  {
    name: "Entertainment",
    body: "Televisions, speakers and home theatre unified for a seamless multimedia experience.",
  },
  {
    name: "Scene Automation",
    body: "Good Morning, Good Night, Movie Mode, Away and Welcome Home — many devices, one trigger.",
  },
  {
    name: "Building Automation",
    body: "Lighting, HVAC, energy monitoring, access and security managed across commercial buildings.",
  },
];

const INDUSTRIES = [
  "Luxury Villas",
  "Independent Houses",
  "Apartments",
  "Commercial Buildings",
  "Offices",
  "Hotels",
  "Restaurants",
  "Educational Institutions",
  "Premium Residential",
];

const PARTNERS = [
  { name: "Matter", slug: "matter" },
  { name: "Z-Wave", slug: "zwave" },
  { name: "KNX", slug: "knx" },
  { name: "Zigbee", slug: "zigbee" },
  { name: "Home Assistant", slug: "homeassistant" },
  { name: "Tuya", slug: "tuya" },
  { name: "AUTOZON", slug: "autozon" },
  { name: "Amazon Alexa", slug: "alexa" },
  { name: "Wipro", slug: "wipro" },
  { name: "Hikvision", slug: "hikvision" },
  { name: "TP-Link", slug: "tplink" },
  { name: "ABB", slug: "abb" },
  { name: "Schneider Electric", slug: "schneider" },
  { name: "Kincony", slug: "kincony" },
];

const PROCESS = [
  ["01", "Understand", "We learn how you live and what you want your space to do."],
  ["02", "Design", "We plan and design an automation system tailored to the project."],
  ["03", "Select", "We choose reliable, compatible devices that work together."],
  ["04", "Install", "Professional installation, cleanly integrated into your space."],
  ["05", "Configure", "Scenes, schedules and integrations set up around your routine."],
  ["06", "Test", "Full testing and commissioning so everything just works."],
  ["07", "Train", "We show you how to use it — simply and confidently."],
  ["08", "Support", "Ongoing support and maintenance for years to come."],
];

const BENEFITS = [
  "Improved Comfort",
  "Enhanced Security",
  "Greater Convenience",
  "Energy Efficiency",
  "Centralized Control",
  "Scalable Systems",
];

const PLANS = [
  {
    name: "DURO Core",
    tagline: "The daily basics, handled for you.",
    price: "₹5L",
    intro: null as string | null,
    features: [
      "Smart lighting & switches",
      "Curtains & climate",
      "Smart door locks",
      "Presence sensors — lights turn on only when someone's really there, in restrooms & wardrobes",
      "One app + voice",
    ],
    featured: false,
  },
  {
    name: "DURO Pro",
    tagline: "Your whole home, taking care of itself.",
    price: "₹10L",
    intro: "Everything in Core, plus:" as string | null,
    features: [
      "AI sensors that learn your routine",
      "Gate automation",
      "Cameras & security",
      "Robot cleaning",
      "Scenes for every moment",
    ],
    featured: true,
  },
  {
    name: "DURO Elite",
    tagline: "Nothing left to do by hand.",
    price: "₹20L",
    intro: "Everything in Pro, plus:" as string | null,
    features: [
      "KNX wired automation — built to last 30 years",
      "Smart toilets",
      "Smart gardening",
      "Music in every room",
      "Whole-home energy care",
    ],
    featured: false,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      {...fadeUp}
      className="text-[10px] md:text-[11px] uppercase tracking-widest2 text-gold mb-5"
    >
      {children}
    </motion.p>
  );
}

/** Vertical process timeline whose golden line grows as you scroll through it. */
function ProcessTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 82%", "end 62%"],
  });
  // spring-smoothed growth so the line eases rather than tracking scroll 1:1
  const grow = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div ref={ref} className="relative">
      {/* dim rail */}
      <div className="absolute left-1.5 top-3 bottom-3 w-px bg-white/12" />
      {/* golden line that grows with scroll */}
      <motion.div
        style={{ scaleY: grow }}
        className="absolute left-1.5 top-3 bottom-3 w-px origin-top bg-gradient-to-b from-gold to-goldsoft"
      />
      <ul className="space-y-14 md:space-y-20">
        {PROCESS.map(([num, title, body], i) => (
          <TimelineNode
            key={num}
            num={num}
            title={title}
            body={body}
            at={i / (PROCESS.length - 1)}
            progress={grow}
          />
        ))}
      </ul>
    </div>
  );
}

function TimelineNode({
  num,
  title,
  body,
  at,
  progress,
}: {
  num: string;
  title: string;
  body: string;
  at: number;
  progress: MotionValue<number>;
}) {
  // the node fills gold as the growing line reaches its position
  const span: [number, number] = [at - 0.05, at + 0.02];
  const fill = useTransform(progress, span, [0, 1]);
  const dotScale = useTransform(progress, span, [1, 1.25]);
  const numColor = useTransform(progress, span, [
    "rgba(200,162,95,0.32)",
    "rgba(200,162,95,0.95)",
  ]);
  return (
    <li className="relative pl-12 md:pl-16">
      {/* node on the rail */}
      <span className="absolute left-1.5 top-1.5 h-3 w-3 -translate-x-1/2">
      <span className="absolute inset-0 rounded-full bg-black ring-1 ring-white/25" />
        <motion.span
          style={{ opacity: fill, scale: dotScale }}
          className="absolute inset-0 rounded-full bg-gold shadow-[0_0_12px_2px_rgba(200,162,95,0.45)]"
        />
      </span>

      <motion.p
        style={{ color: numColor }}
        className="font-display text-2xl md:text-3xl leading-none mb-2"
      >
        {num}
      </motion.p>
      <h3 className="text-lg md:text-xl font-medium text-white tracking-wide mb-2">
        {title}
      </h3>
      <p className="text-sm md:text-base font-light text-stone-400 leading-relaxed max-w-md">
        {body}
      </p>
    </li>
  );
}

import { useBookingModal } from "@/lib/store";

export default function SitePage() {
  const openBookingModal = useBookingModal((s) => s.openBookingModal);
  const [smoothTrail, setSmoothTrail] = useState({ x: 0, y: 0, angle: 0, visible: false });
  const lastPointer = useRef({ x: 0, y: 0 });
  const trailHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <main
      className="relative z-10"
      onMouseMove={(event) => {
        const x = event.clientX;
        const y = event.clientY;
        const deltaX = x - lastPointer.current.x;
        const deltaY = y - lastPointer.current.y;
        const angle = deltaX || deltaY ? Math.atan2(deltaY, deltaX) * (180 / Math.PI) : smoothTrail.angle;
        lastPointer.current = { x, y };
        setSmoothTrail({ x, y, angle, visible: true });
        if (trailHideTimer.current) clearTimeout(trailHideTimer.current);
        trailHideTimer.current = setTimeout(() => {
          setSmoothTrail((trail) => ({ ...trail, visible: false }));
        }, 120);
      }}
      onMouseLeave={() => setSmoothTrail((trail) => ({ ...trail, visible: false }))}
    >
      <span
        aria-hidden
        className={`pointer-events-none fixed z-30 h-2 w-8 origin-right rounded-full bg-gradient-to-r from-transparent via-gold/25 to-gold/90 blur-[1px] transition-opacity duration-100 ease-out ${smoothTrail.visible ? "opacity-100" : "opacity-0"}`}
        style={{
          left: smoothTrail.x + 7,
          top: smoothTrail.y + 12,
          transform: `translate(-100%, -50%) rotate(${smoothTrail.angle}deg)`,
          boxShadow: "0 0 8px rgba(200, 162, 95, 0.7)",
        }}
      />
      {/* soft lead-in so the page emerges from the 3D exterior behind it */}
      <div className="h-24 bg-gradient-to-b from-transparent to-black" />

      {/* ---------- About ---------- */}
      <section className="bg-black px-6 md:px-16 lg:px-24 py-24 md:py-32">
        <div className="max-w-6xl w-full">
          <Kicker>Beyond Devices</Kicker>
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-medium text-white leading-[1.05]"
          >
            We don&apos;t sell gadgets.
            <br />
            We deliver intelligent buildings.
          </motion.h2>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="mt-8 text-base md:text-xl font-light text-stone-300/90 leading-relaxed max-w-3xl"
          >
            DURO Automation designs, integrates, installs and supports complete
            automation ecosystems — where lighting, climate, security,
            entertainment and access all work together as one. Our objective is
            simple: transform ordinary buildings into intelligent environments
            that improve comfort, security, efficiency and everyday quality of
            life.
          </motion.p>

          <div className="mt-12 flex flex-wrap gap-3 max-w-4xl">
            {BENEFITS.map((b, i) => (
              <motion.span
                key={b}
                {...fadeUp}
                whileHover={{ scale: 1.12, transition: { duration: 0.15 } }}
                transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                className="relative cursor-default rounded-full border border-white/30 bg-white/[0.03] px-5 py-2.5 text-xs md:text-sm tracking-wide text-stone-200 transition-all duration-300 hover:z-10 hover:border-gold hover:bg-gold/10 hover:text-gold hover:ring-1 hover:ring-gold hover:shadow-[0_0_0_1px_rgba(200,162,95,0.7),0_0_10px_rgba(200,162,95,0.5)]"
              >
                {b}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Live 2D smart-home controller ---------- */}
      <SmartHomeController />

      {/* ---------- Services ---------- */}
      <section className="bg-black px-6 md:px-16 lg:px-24 pb-24 md:pb-32 border-t border-white/[0.06]">
        <div className="max-w-6xl w-full pt-24 md:pt-32">
          <Kicker>What We Automate</Kicker>
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl md:text-6xl font-medium text-white leading-[1.05] mb-14"
          >
            One system. Every part of the space.
          </motion.h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {SERVICES.map((svc, i) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.12, transition: { duration: 0.15 } }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: (i % 3) * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative cursor-default rounded-2xl border border-white/[0.12] bg-black p-7 md:p-8 transition-all duration-300 hover:z-10 hover:border-gold hover:bg-gold/[0.06] hover:ring-1 hover:ring-gold hover:shadow-[0_0_0_2px_rgba(200,162,95,0.55),0_0_22px_rgba(200,162,95,0.55)]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  <h3 className="font-display text-xl md:text-2xl text-white">
                    {svc.name}
                  </h3>
                </div>
                <p className="text-sm font-light text-stone-400 leading-relaxed">
                  {svc.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Industries (right→left marquee) ---------- */}
      <section className="bg-black py-24 md:py-32 border-t border-white/[0.06]">
        <div className="max-w-6xl w-full px-6 md:px-16 lg:px-24">
          <Kicker>Where We Work</Kicker>
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl md:text-6xl font-medium text-white leading-[1.05] mb-14"
          >
            From private villas to hospitality at scale.
          </motion.h2>
        </div>

        {/* full-bleed marquee with fading edges */}
        <div className="marquee relative -my-6 overflow-hidden py-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 md:w-40 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 md:w-40 bg-gradient-to-l from-black to-transparent" />
          <div className="marquee-track relative z-10 flex w-max">
            {[...INDUSTRIES, ...INDUSTRIES].map((ind, i) => (
              <span
                key={i}
                aria-hidden={i >= INDUSTRIES.length}
                className="mx-1.5 md:mx-2 shrink-0 cursor-default whitespace-nowrap rounded-full border border-white/30 px-5 md:px-7 py-2.5 md:py-3 text-sm md:text-base tracking-wide text-stone-200 transition-all duration-300 hover:mx-5 hover:z-20 hover:scale-[1.18] hover:border-gold hover:bg-gold/10 hover:text-gold hover:shadow-[0_0_0_1px_rgba(200,162,95,0.9),0_0_7px_rgba(200,162,95,0.75),0_0_15px_rgba(200,162,95,0.45)]"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Partners (left→right marquee) ---------- */}
      <section className="bg-black py-24 md:py-32 border-t border-white/[0.06]">
        <div className="max-w-6xl w-full px-6 md:px-16 lg:px-24">
          <Kicker>Partners &amp; Integrations</Kicker>
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl md:text-6xl font-medium text-white leading-[1.05] mb-14"
          >
            Works with the platforms you trust.
          </motion.h2>
        </div>

        {/* full-bleed marquee (left → right) with fading edges */}
        <div className="marquee relative -my-6 overflow-hidden py-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 md:w-40 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 md:w-40 bg-gradient-to-l from-black to-transparent" />
          <div className="marquee-track-right relative z-10 flex w-max">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <span
                key={i}
                aria-hidden={i >= PARTNERS.length}
                title={p.name}
                className="group mx-1.5 md:mx-2 shrink-0 flex items-center justify-center cursor-default rounded-full border border-white/25 px-6 md:px-8 py-3 md:py-3.5 transition-all duration-300 hover:mx-5 hover:z-20 hover:scale-[1.18] hover:border-gold hover:bg-gold/10 hover:shadow-[0_0_0_1px_rgba(200,162,95,0.9),0_0_7px_rgba(200,162,95,0.75),0_0_15px_rgba(200,162,95,0.45)]"
              >
                <img
                  src={`/partners/${p.slug}.png`}
                  alt={p.name}
                  className="h-6 md:h-7 w-auto max-w-[120px] md:max-w-[150px] object-contain opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Process (scroll-grown golden timeline) ---------- */}
      <section className="bg-black px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-white/[0.06]">
        <div className="max-w-6xl w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
              <Kicker>How We Work</Kicker>
              <motion.h2
                {...fadeUp}
                className="font-display text-4xl md:text-6xl font-medium text-white leading-[1.05] mb-6"
              >
                A considered process, end to end.
              </motion.h2>
              <motion.p
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: 0.1 }}
                className="text-base md:text-lg font-light text-stone-400 leading-relaxed"
              >
                From initial consultation to installation, configuration and long-term support — every step is executed with meticulous attention to detail.
              </motion.p>
            </div>
            <div className="lg:col-span-7">
              <ProcessTimeline />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="bg-black px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-white/[0.06]">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h2
              {...fadeUp}
              className="font-display text-4xl md:text-6xl font-medium text-gold leading-[1.05]"
            >
              Plans &amp; Upgrades
            </motion.h2>
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.08 }}
              className="mt-6 text-base md:text-xl font-light text-stone-300/90 leading-relaxed"
            >
              Save your time and automate things.
            </motion.p>
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
              className="mt-3 text-sm md:text-base font-light text-stone-400/90 leading-relaxed"
            >
              Your home handles the lights, the doors, the chores. You handle
              what actually matters.
            </motion.p>
          </div>

          <div className="mt-16 grid items-start gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`group relative flex flex-col rounded-2xl border p-7 md:p-8 transition-all duration-300 hover:z-10 hover:border-gold hover:shadow-[0_0_0_2px_rgba(200,162,95,0.6),0_0_28px_rgba(200,162,95,0.5)] ${
                  plan.featured
                    ? "border-gold/50 bg-gold/[0.05] ring-1 ring-gold/30 shadow-[0_0_20px_rgba(200,162,95,0.2)] md:-mt-5"
                    : "border-white/[0.12] bg-black"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-4 py-1 text-[10px] font-semibold uppercase tracking-widest2 text-black">
                    Most loved
                  </span>
                )}

                <h3 className="font-display text-2xl md:text-3xl text-white">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm md:text-base font-light leading-relaxed text-stone-400">
                  {plan.tagline}
                </p>

                <div className="mt-6">
                  <span className="block text-[11px] uppercase tracking-widest2 text-stone-500">
                    from
                  </span>
                  <span className="font-display text-4xl md:text-5xl text-white">
                    {plan.price}
                  </span>
                </div>

                <div className="my-6 h-px bg-white/[0.08]" />

                {plan.intro && (
                  <p className="mb-4 text-sm font-light text-stone-400">
                    {plan.intro}
                  </p>
                )}
                <ul className="space-y-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                        className="mt-[3px] h-4 w-4 shrink-0 text-green-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm md:text-[15px] font-light leading-relaxed text-stone-200">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.p
            {...fadeUp}
            className="mx-auto mt-14 max-w-3xl text-center text-sm md:text-base font-light leading-relaxed text-stone-500"
          >
            Same premium quality in every package. Core senses true presence, Pro
            adds AI that learns you, and Elite is fully wired KNX — engineered to
            stay reliable for decades.
          </motion.p>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="relative bg-black px-6 md:px-16 py-28 md:py-40 border-t border-white/[0.06] text-center overflow-hidden">
        <div className="relative max-w-3xl mx-auto">
          <Kicker>Let&apos;s Begin</Kicker>
          <motion.h2
            {...fadeUp}
            className="font-display text-5xl md:text-7xl font-medium text-white leading-[1.02]"
          >
            Make your space
            <br />
            intelligent.
          </motion.h2>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.1 }}
            className="mt-6 text-base md:text-lg font-light text-stone-300/90 max-w-xl mx-auto leading-relaxed"
          >
            Tell us about your villa, home, office or hospitality project. We
            design the system, install it cleanly, and support it for the long
            run.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.2 }}
            className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={openBookingModal}
              className="rounded-full bg-gold text-black text-[12px] font-semibold uppercase tracking-[0.2em] px-9 py-4 hover:bg-goldsoft hover:shadow-[0_0_20px_rgba(200,162,95,0.4)] transition-all duration-300"
            >
              Book Service
            </button>
            <a
              href="mailto:duroautomation.sales@gmail.com"
              className="text-[13px] tracking-[0.15em] text-stone-300 hover:text-gold transition-colors duration-300"
            >
              duroautomation.sales@gmail.com
            </a>
          </motion.div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-black px-6 md:px-16 py-14 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
          {/* Brand */}
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-semibold tracking-wide text-white">
              DURO
            </span>
            <span className="text-[10px] font-light tracking-widest2 text-stone-400 uppercase">
              Automation
            </span>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[11px] tracking-[0.2em] uppercase text-stone-400 font-medium">
              Connect Us On
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/duroautomation?igsh=MXZvY24xNWxua3hlag%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white hover:bg-gold/20 hover:border-gold/40 hover:text-gold transition-all duration-300"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@DUROAUTOMATIONLIVE"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white hover:bg-gold/20 hover:border-gold/40 hover:text-gold transition-all duration-300"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/duroautomation/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white hover:bg-gold/20 hover:border-gold/40 hover:text-gold transition-all duration-300"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://www.threads.com/@duroautomation?invite=0"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Threads"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white hover:bg-gold/20 hover:border-gold/40 hover:text-gold transition-all duration-300"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.733 2.108-1.152 3.459-1.19 1.148-.03 2.195.116 3.128.435-.043-1.11-.282-1.958-.738-2.553-.527-.687-1.39-1.041-2.565-1.054h-.039c-.932 0-1.76.297-2.333.838l-1.42-1.47C8.543 4.27 9.81 3.74 11.4 3.719h.056c1.763.02 3.105.635 3.987 1.828.788 1.07 1.196 2.56 1.22 4.434l.003.457c.9.436 1.653 1.02 2.238 1.744.876 1.083 1.32 2.444 1.32 4.047 0 .192-.008.388-.023.584-.204 2.645-1.306 4.672-3.275 6.02C15.22 23.676 13.505 24 12.186 24zm-1.39-8.617c-.988.027-1.783.282-2.305.74-.474.416-.684.953-.611 1.553.096.826.753 1.745 2.527 1.65 1.037-.06 1.83-.468 2.357-1.213.436-.617.706-1.432.82-2.418-.82-.307-1.775-.34-2.788-.312z"/>
                </svg>
              </a>
              <a
                href="https://x.com/duroautomation?s=11"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white hover:bg-gold/20 hover:border-gold/40 hover:text-gold transition-all duration-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center gap-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-stone-500">
              © 2026 DURO Automation
            </p>
            <button
              onClick={() =>
                window.scrollTo({ top: 0, behavior: "smooth" })
              }
              className="text-[10px] tracking-[0.25em] uppercase text-stone-400 hover:text-gold transition-colors duration-300"
            >
              ↑ Back to top
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
