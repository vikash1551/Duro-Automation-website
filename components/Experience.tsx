"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Scene from "./Scene";
import Nav from "./Nav";
import Hud from "./Hud";
import ProgressRail from "./ProgressRail";
import Steam from "./Steam";
import FinaleOverlay from "./FinaleOverlay";
import Loader from "./Loader";
import ScrollHint from "./ScrollHint";
import SitePage from "./SitePage";
import { scrollToP, stationFraction, TOTAL_VH } from "@/lib/journey";
import { useJourney, pointerState, scrollApi } from "@/lib/store";

import BookingModal from "./BookingModal";

export default function Experience() {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pageSentinelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // always begin the walk at the front gate — beat late browser scroll restoration
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      lerp: 0.10,
      smoothWheel: true,
      touchMultiplier: 1.6,
      syncTouch: true,
      syncTouchLerp: 0.06,
    });
    lenis.scrollTo(0, { immediate: true, force: true });
    let zeroFrames = 0;
    const zeroLoop = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
        lenis.scrollTo(0, { immediate: true, force: true });
      }
      if (++zeroFrames < 8) requestAnimationFrame(zeroLoop);
    };
    requestAnimationFrame(zeroLoop);

    // slide the 3D "stage" (house + finale) up as one, in sync with the page,
    // once the walk finishes — so it scrolls away rather than staying pinned
    // while the page reveals over it.
    let trackH = trackRef.current?.offsetHeight ?? 0;
    let vh = window.innerHeight;
    const measure = () => {
      trackH = trackRef.current?.offsetHeight ?? 0;
      vh = window.innerHeight;
    };
    measure();
    window.addEventListener("resize", measure);

    const onScroll = () => {
      ScrollTrigger.update();
      // the walk fills the screen until scrollY reaches (trackH - vh); past
      // that, translate the stage up 1:1 with further scrolling
      const over = Math.max(0, window.scrollY - (trackH - vh));
      if (stageRef.current) {
        stageRef.current.style.transform = `translate3d(0, ${-over}px, 0)`;
      }
      // navbar turns black ONLY when the 3D house has completely scrolled off screen
      const pastHouse = over >= Math.max(1, vh - 30);
      useJourney.getState().setInPage(pastHouse);
    };
    lenis.on("scroll", onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      trigger: trackRef.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (
          process.env.NODE_ENV === "development" &&
          (window as unknown as Record<string, unknown>).__freezeProgress
        ) {
          return;
        }
        useJourney.getState().setProgress(scrollToP(self.progress));
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${self.progress})`;
        }
      },
    });

    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__st = st;
      (window as unknown as Record<string, unknown>).__journey = useJourney;
    }

    scrollApi.scrollToStation = (i: number) => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const target = stationFraction(i) * max;
      lenis.scrollTo(target, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
    };

    const onPointer = (e: PointerEvent) => {
      pointerState.x = e.clientX / window.innerWidth - 0.5;
      pointerState.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointer);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", measure);
      scrollApi.scrollToStation = null;
      st.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      {/* the 3D world + finale — one "stage" that slides up together when
          scrolling past the walkthrough into the page below */}
      <div
        ref={stageRef}
        className="fixed inset-0 z-0 will-change-transform"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <Canvas
          flat
          linear
          dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 5], fov: 50 }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
        <FinaleOverlay />
      </div>

      {/* cinematic treatment */}
      <div className="cine-vignette" />

      {/* interface */}
      <Nav barRef={barRef} />
      <Hud />
      <ProgressRail />
      <Steam />
      <ScrollHint />
      <Loader />
      <BookingModal />

      {/* scroll track — its height is the length of the walk */}
      <div ref={trackRef} style={{ height: `${TOTAL_VH}vh` }} aria-hidden />

      {/* regular scrollable page content, revealed after the walkthrough.
          Observing this whole block keeps "page mode" on for its full height. */}
      <div ref={pageSentinelRef}>
        <SitePage />
      </div>
    </>
  );
}
