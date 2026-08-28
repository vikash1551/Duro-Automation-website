export type Chip = { label: string };

export type Room = {
  file: string;
  railLabel: string;
  kicker: string;
  title: string;
  body: string;
  chips: Chip[];
  /** Screen-space point (0..1, y up) the camera pushes toward — the "doorway" */
  portal: [number, number];
  align: "left" | "right" | "center";
  /** Microcopy shown while walking from this room to the next */
  transition: string;
  /** Compact HUD treatment for short connector beats */
  minor?: boolean;
  /** Starting magnification — used to re-enter the same photo "deeper" (corridor pass 2) */
  baseZoom?: number;
  /** Multiplier on dolly strength for this room's depth travel */
  dollyScale?: number;
  /** Multiplier on lateral parallax sway */
  swayScale?: number;
  /**
   * Scroll-scrubbed walking clip for the segment FROM this stop to the next.
   * The clip's first frame must match this stop's photo and its last frame
   * the next stop's photo — scrubbing it IS the camera walk.
   */
  clip?: string;
  /**
   * If set, the SAME clip is scrubbed in REVERSE on the next segment (leaving
   * the room this clip led into) — you walk back out to the corridor before
   * heading on. No extra video file; the clip just plays backwards.
   */
  reverseOut?: boolean;
};

/** Fraction of each segment spent resting inside the room before moving on */
export const DWELL = 0.42;

export const ROOMS: Room[] = [
  {
    // Arrival uses the SAME plate as the gate stop (the gate clip's first
    // frame) so approach → gate → drive-in is one seamless move — the old
    // close-up exterior mismatched this far framing and caused the collision.
    // The close exterior render still returns as the Home finale.
    file: "02-gate.jpg",
    railLabel: "Arrival",
    kicker: "Scene 01 — Arrival",
    title: "A home that senses you coming",
    body: "Dusk settles, and the villa is already awake. Façade and landscape lighting have set the evening scene — no switch was touched.",
    chips: [
      { label: "Perimeter sensing active" },
      { label: "Façade scene · Evening" },
      { label: "Cameras monitoring" },
    ],
    portal: [0.5, 0.47],
    align: "left",
    transition: "Motion detected — opening the main gate",
    dollyScale: 0.85,
    swayScale: 0.8,
  },
  {
    file: "02-gate.jpg",
    railLabel: "Gate",
    kicker: "Scene 02 — Smart Access",
    title: "The gate knows it's you",
    body: "Secure access recognition slides the gate open as you approach, the driveway lights rise, and the door unlocks as you reach it.",
    chips: [
      { label: "Gate opened automatically" },
      { label: "Driveway lights · 80%" },
      { label: "Door unlocking" },
    ],
    portal: [0.5, 0.47],
    align: "right",
    transition: "The door opens — step inside",
    dollyScale: 1,
    // one continuous walk: gate → driveway → door opening → hall (merged,
    // 10s all-intra). No intermediate still, no clip-to-clip seam.
    clip: "/clips/01-gate-to-hall.mp4",
  },
  {
    file: "05-hall.jpg",
    railLabel: "Hall",
    kicker: "Scene 03 — Welcome Home",
    title: "The house greets you",
    body: "Cross the threshold and the Welcome Home scene begins — lights fade up ahead of you, the climate settles, ambient audio rises, and the curtains find their evening position.",
    chips: [
      { label: "Welcome Home scene active" },
      { label: "Lights ahead · ON" },
      { label: "Climate · 23°C" },
      { label: "Curtains · Auto" },
    ],
    portal: [0.53, 0.48],
    align: "left",
    transition: "Turning down the corridor",
    dollyScale: 1.05,
  },
  {
    file: "06b-corridor-bed.jpg",
    railLabel: "Corridor",
    kicker: "Scene 04 — The Corridor",
    title: "Light follows you",
    body: "",
    chips: [{ label: "Presence lighting · following" }],
    portal: [0.5, 0.48],
    align: "center",
    transition: "Walking to the bedroom — door opening",
    minor: true,
    dollyScale: 1,
    // scroll-scrubbed walk: corridor → into the bedroom (10s, all-intra)
    clip: "/clips/04-corridor-to-bedroom.mp4",
    reverseOut: true, // bedroom → back to corridor plays this clip in reverse
  },
  {
    file: "07-bedroom.jpg",
    railLabel: "Bedroom",
    kicker: "Scene 05 — Comfort",
    title: "Rest, perfected",
    body: "Automation works quietly here: sheer curtains glide open to the sunset, the AC finds your temperature, and the bedside scene is set for the evening.",
    chips: [
      { label: "Curtains open" },
      { label: "AC · 22°C" },
      { label: "Evening scene ready" },
      { label: "Bedside panel ready" },
    ],
    portal: [0.6, 0.5],
    align: "right",
    transition: "Back out — heading to the kitchen",
    dollyScale: 1,
  },
  {
    file: "06c-corridor-kit.jpg",
    railLabel: "Corridor",
    kicker: "Scene 06 — Down the Corridor",
    title: "On to the kitchen",
    body: "",
    chips: [{ label: "Path lighting · guiding" }],
    portal: [0.5, 0.47],
    align: "center",
    transition: "Walking through to the kitchen",
    minor: true,
    dollyScale: 1,
    // scroll-scrubbed walk: corridor → through the door → kitchen (10s, all-intra)
    clip: "/clips/06-corridor-to-kitchen.mp4",
    reverseOut: true, // kitchen → back to corridor plays this clip in reverse
  },
  {
    file: "08-kitchen.jpg",
    railLabel: "Kitchen",
    kicker: "Scene 07 — The Heart",
    title: "Ready before you are",
    body: "Island lighting glows to life, appliances wake on schedule, and the coffee is already brewing — every morning, exactly on time.",
    chips: [
      { label: "Island lights ON" },
      { label: "Coffee machine · Brewing" },
      { label: "Appliances online" },
    ],
    portal: [0.35, 0.5],
    align: "left",
    transition: "Down the hall — the bathroom senses you",
    dollyScale: 1,
  },
  {
    file: "09-corridor-bath.jpg",
    railLabel: "Sensing",
    kicker: "Scene 08 — Sensing",
    title: "It knows you're here",
    body: "",
    chips: [{ label: "Presence sensed" }, { label: "Warm light rising" }],
    portal: [0.5, 0.5],
    align: "center",
    transition: "Down the corridor — the bathroom senses you",
    minor: true,
    dollyScale: 1,
    // scroll-scrubbed walk: corridor → into the bathroom (10s, all-intra)
    clip: "/clips/07-corridor-to-bathroom.mp4",
    reverseOut: true, // bathroom → back to corridor plays this clip in reverse
  },
  {
    file: "10-bathroom.jpg",
    railLabel: "Bath",
    kicker: "Scene 09 — Ritual",
    title: "Warmth on arrival",
    body: "Motion sensing brings the mirror light and warm ambient tones to life, and the smart shower starts at your perfect temperature.",
    chips: [
      { label: "Mirror light ON" },
      { label: "Shower · 38°C" },
      { label: "Steam mode" },
    ],
    portal: [0.68, 0.5],
    align: "right",
    transition: "Out to the corridor",
    dollyScale: 0.95,
  },
  {
    file: "10b-corridor-balcony.jpg",
    railLabel: "Corridor",
    kicker: "Scene 10 — To the Balcony",
    title: "Toward the evening air",
    body: "",
    chips: [{ label: "Path lighting · guiding" }],
    portal: [0.5, 0.48],
    align: "center",
    transition: "Sliding doors open to the balcony",
    minor: true,
    dollyScale: 1,
    // scroll-scrubbed walk: corridor → out onto the balcony (~7s, all-intra)
    clip: "/clips/09-corridor-to-balcony.mp4",
  },
  {
    file: "11-balcony.jpg",
    railLabel: "Balcony",
    kicker: "Scene 11 — Golden Hour",
    title: "Your evening, orchestrated",
    body: "Sliding doors part to the skyline. Outdoor lighting, security and scenes — all in harmony, all from one system.",
    chips: [
      { label: "Doors open" },
      { label: "Evening scene active" },
      { label: "Perimeter secure" },
    ],
    portal: [0.5, 0.55],
    align: "left",
    transition: "Evening settles — heading home",
    dollyScale: 0.9,
    swayScale: 0.9,
  },
  {
    file: "01-exterior.jpg",
    railLabel: "Home",
    kicker: "Scene 12 — Home",
    title: "DURO Automation",
    body: "",
    chips: [],
    portal: [0.5, 0.5],
    align: "left",
    transition: "",
    dollyScale: 0.7,
  },
];

export const N_STOPS = ROOMS.length; // 12
export const N_SEG = N_STOPS - 1; // 11 walk segments

/**
 * Relative scroll length of each of the 11 segments (must be N_SEG long).
 * The 10s scrubbed clips (seg 1 gate→hall, seg 3 corridor→bedroom,
 * seg 5 corridor→kitchen) get extra length so the walk isn't rushed.
 *  idx: 0 ex→gate | 1 gate→hall | 2 hall→corr | 3 corr→bed | 4 bed→corr |
 *       5 corr→kit | 6 kit→corr-bath | 7 corr-bath→bath | 8 bath→corr-balc |
 *       9 corr-balc→balcony | 10 balcony→home
 * Clip segments get more room: seg 1 (~14.6s gate→hall) most; seg 3/5/7 are
 * 10s corridor clips; seg 9 is the ~7s corridor→balcony clip. Seg 4/6/8 are
 * the reverse walk-outs (same 10s clips played backwards), so they match.
 * Seg 10 (balcony→home) closes the loop straight back to the exterior.
 */
export const SEG_W = [1, 2.4, 1, 1.6, 1.6, 1.6, 1.6, 1.6, 1.6, 1.2, 1.1];
/** Relative scroll length of the finale dwell on the returning exterior */
export const FINALE_W = 0.95;

const CUM: number[] = [];
{
  let acc = 0;
  for (const w of SEG_W) {
    CUM.push(acc);
    acc += w;
  }
  CUM.push(acc); // start of finale zone
}
export const TOTAL_W = CUM[N_SEG] + FINALE_W;

/** Progress domain: [0, N_SEG + 1] — integer k = resting at stop k */
export const TOTAL_P = N_SEG + 1;

/** Map raw scroll fraction [0,1] to weighted journey progress */
export function scrollToP(t: number): number {
  const w = Math.max(0, Math.min(t, 1)) * TOTAL_W;
  for (let i = 0; i < N_SEG; i++) {
    if (w < CUM[i] + SEG_W[i]) return i + (w - CUM[i]) / SEG_W[i];
  }
  return N_SEG + Math.min((w - CUM[N_SEG]) / FINALE_W, 1);
}

/** Scroll fraction that rests the camera at stop i */
export function stationFraction(i: number): number {
  const k = Math.max(0, Math.min(i, N_SEG));
  const w = k === N_SEG ? CUM[N_SEG] + FINALE_W * 0.35 : CUM[k] + SEG_W[k] * 0.06;
  return w / TOTAL_W;
}

/** Scroll length per weight unit, in vh */
export const SEG_VH = 160;
export const TOTAL_VH = Math.round(TOTAL_W * SEG_VH);

export const SERVICES = [
  "Lighting Automation",
  "Climate Control",
  "Smart Security",
  "Access Control",
  "Curtains & Blinds",
  "Entertainment",
  "Voice Control",
  "Scene Automation",
];
