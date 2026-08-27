import { create } from "zustand";
import { DWELL, N_SEG, N_STOPS, TOTAL_P } from "./journey";

/** Mutable pointer state, read directly inside the render loop (no re-renders) */
export const pointerState = { x: 0, y: 0 };

export type Phase = "dwell" | "travel" | "finale";

interface JourneyState {
  /** Continuous weighted progress in [0, TOTAL_P] — read via getState() in useFrame */
  progress: number;
  /** Index of the stop whose content is on screen */
  room: number;
  phase: Phase;
  /** Nearest stop for the progress rail */
  station: number;
  /** True once the visitor has scrolled a little (hides the hint) */
  started: boolean;
  loaded: boolean;
  /** True once scrolled past the 3D walk into the regular page content below */
  inPage: boolean;
  setInPage: (v: boolean) => void;
  setLoaded: (v: boolean) => void;
  setProgress: (p: number) => void;
}

export const useJourney = create<JourneyState>((set, get) => ({
  progress: 0,
  room: 0,
  phase: "dwell",
  station: 0,
  started: false,
  loaded: false,
  inPage: false,
  setInPage: (v) => {
    if (get().inPage !== v) set({ inPage: v });
  },
  setLoaded: (v) => set({ loaded: v }),
  setProgress: (p) => {
    const clamped = Math.max(0, Math.min(p, TOTAL_P));
    const s = Math.min(Math.floor(clamped), N_SEG - 1);
    const v = Math.min(Math.max(clamped - s, 0), 1);
    const phase: Phase =
      clamped > N_SEG + 0.06 ? "finale" : v < DWELL ? "dwell" : "travel";
    const station = Math.min(Math.round(clamped), N_STOPS - 1);
    const started = clamped > 0.1;
    const prev = get();
    if (
      prev.room !== s ||
      prev.phase !== phase ||
      prev.station !== station ||
      prev.started !== started
    ) {
      set({ progress: clamped, room: s, phase, station, started });
    } else {
      // keep the continuous value fresh for the render loop without notifying
      useJourney.setState({ progress: clamped }, false);
    }
  },
}));

/** Set by Experience so the progress rail can drive smooth scrolling */
export const scrollApi: { scrollToStation: ((i: number) => void) | null } = {
  scrollToStation: null,
};

interface BookingModalState {
  isOpen: boolean;
  openBookingModal: () => void;
  closeBookingModal: () => void;
}

export const useBookingModal = create<BookingModalState>((set) => ({
  isOpen: false,
  openBookingModal: () => set({ isOpen: true }),
  closeBookingModal: () => set({ isOpen: false }),
}));
