"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Live smart-home controller.  RIGHT = a real DURO phone panel;      */
/*  tapping a card / scene updates React state and the LEFT isometric   */
/*  "digital twin" of the residence reacts in real time — lights pool,  */
/*  the fan spins, the gate slides, curtains part, cameras arm, music   */
/*  plays.  Original DURO styling: black + gold, cinematic.             */
/* ------------------------------------------------------------------ */

type Scene = "morning" | "evening" | "arm" | "away" | null;
type FanSpeed = "low" | "medium" | "high";

/* ---------- phone icons ---------- */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const Bulb = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></svg>);
const FanI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4c1-3.6-.4-6.4-2.6-6.4-1.8 0-2.4 2.4-.4 4.2M13.6 12c3.6-1 6.4.4 6.4 2.6 0 1.8-2.4 2.4-4.2.4M12 13.6c-1 3.6.4 6.4 2.6 6.4 1.8 0 2.4-2.4.4-4.2" /></svg>);
const CurtainI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M3 4h18M4 4v16M20 4v16M4 20c3-1 4-4 4-8s-1-6-4-8M20 20c-3-1-4-4-4-8s1-6 4-8" /></svg>);
const GateI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M3 21V6l6-2M21 21V6l-6-2M9 4v17M15 4v17M3 21h18M7 8v9M11 8v9M17 8v9" /></svg>);
const MusicI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>);
const CameraI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M3 7h13l4 3v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /><circle cx="10" cy="13" r="3" /></svg>);
const ThermoI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /></svg>);
const ShieldI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>);
const TvI = () => (<svg viewBox="0 0 24 24" className="h-full w-full" {...stroke}><rect x="2.5" y="5" width="19" height="12" rx="1.6" /><path d="M8 21h8M12 17v4" /></svg>);

/* ================================================================== */
/*  Isometric "digital twin" of the residence                          */
/* ================================================================== */

// True 30° architectural isometric projection (exact 1:1:1 scale ratio across X, Y, Z)
const SX = 26, SY = 15, SZ = 30, OX = 250, OY = 76;
const P = (x: number, y: number, z = 0) =>
  `${((x - y) * SX + OX).toFixed(1)},${((x + y) * SY - z * SZ + OY).toFixed(1)}`;
const CX = (x: number, y: number) => (x - y) * SX + OX;
const CY = (x: number, y: number, z = 0) => (x + y) * SY - z * SZ + OY;

// a shaded extruded box (three visible faces)
function Box({ x, y, w, d, h, z = 0, c }: { x: number; y: number; w: number; d: number; h: number; z?: number; c: [string, string, string] }) {
  const [top, right, left] = c;
  return (
    <g>
      {/* +y face (front-left) */}
      <polygon points={`${P(x, y + d, z)} ${P(x, y + d, z + h)} ${P(x + w, y + d, z + h)} ${P(x + w, y + d, z)}`} fill={left} />
      {/* +x face (front-right) */}
      <polygon points={`${P(x + w, y, z)} ${P(x + w, y, z + h)} ${P(x + w, y + d, z + h)} ${P(x + w, y + d, z)}`} fill={right} />
      {/* top */}
      <polygon points={`${P(x, y, z + h)} ${P(x + w, y, z + h)} ${P(x + w, y + d, z + h)} ${P(x, y + d, z + h)}`} fill={top} />
    </g>
  );
}

// soft contact shadow on the floor (30° isometric ellipse)
function Shad({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return (
    <ellipse cx={CX(x + w / 2, y + d / 2)} cy={CY(x + w / 2, y + d / 2)} rx={(w + d) * 8.5} ry={(w + d) * 4.9} fill="rgba(0,0,0,0.38)" filter="url(#soft)" />
  );
}

function Floor({ x0, y0, x1, y1, fill }: { x0: number; y0: number; x1: number; y1: number; fill: string }) {
  return <polygon points={`${P(x0, y0)} ${P(x1, y0)} ${P(x1, y1)} ${P(x0, y1)}`} fill={fill} stroke="rgba(245,166,35,0.10)" strokeWidth={1} />;
}

// warm light pool for a room (screen space), fades with `on`
function Glow({ x, y, r, on, color = "rgba(255,196,120," }: { x: number; y: number; r: number; on: boolean; color?: string }) {
  return (
    <circle
      cx={CX(x, y)} cy={CY(x, y)} r={r}
      fill={`url(#warm)`}
      style={{ mixBlendMode: "screen", opacity: on ? 1 : 0, transition: "opacity 900ms ease" }}
    />
  );
}

const WALL: [string, string, string] = ["#36363f", "#292930", "#1e1e24"];
const WOOD: [string, string, string] = ["#745a43", "#5a4430", "#413122"];
const WARMW: [string, string, string] = ["#7d6046", "#604733", "#463322"];
const SOFA: [string, string, string] = ["#61616d", "#4b4b56", "#393941"];
const CREAM: [string, string, string] = ["#efe5d5", "#d2c6b3", "#aca091"];
const DARK: [string, string, string] = ["#4c4c57", "#3b3b44", "#2c2c33"];
const MARB: [string, string, string] = ["#dde0e7", "#bbbec6", "#989aa1"];
const STONE: [string, string, string] = ["#4f5362", "#3f434f", "#31353f"];
const METAL: [string, string, string] = ["#7c7c87", "#61616c", "#4a4a52"];
const LEAF: [string, string, string] = ["#577a49", "#44623b", "#324a2c"];

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return null;
}

function Pendant({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g>
      <line x1={CX(x, y)} y1={CY(x, y, 1.85)} x2={CX(x, y)} y2={CY(x, y, 1.5)} stroke="rgba(150,150,160,0.35)" strokeWidth="1" />
      <circle cx={CX(x, y)} cy={CY(x, y, 1.5)} r="22" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: on ? 0.9 : 0, transition: "opacity 700ms" }} />
      <ellipse cx={CX(x, y)} cy={CY(x, y, 1.5)} rx="5" ry="3" fill={on ? "#ffce88" : "#3a3a42"} style={{ transition: "fill 700ms" }} />
    </g>
  );
}

function IsoHome({
  lights, fan, fanSpeed = "medium", curtains, gate, music, security, tv, temp,
  carTarget = 0, carParked = false, carMoving = null, onToggleGate,
}: {
  lights: boolean; fan: boolean; fanSpeed?: FanSpeed; curtains: boolean; gate: boolean; music: boolean; security: boolean; tv: boolean; temp: number;
  carTarget?: number; carParked?: boolean; carMoving?: "entering" | "exiting" | null; onToggleGate?: () => void;
}) {
  const coolI = Math.max(0.12, Math.min(0.95, 0.3 + (24 - temp) * 0.07));

  // gate swing (0 = closed, 1 = fully open) — spring so both leaves swing smoothly inward
  const gTarget = useMotionValue(gate ? 1 : 0);
  const gSpring = useSpring(gTarget, { stiffness: 150, damping: 22 });
  const [gv, setGv] = useState(gate ? 1 : 0);
  useEffect(() => { gTarget.set(gate ? 1 : 0); }, [gate, gTarget]);
  useMotionValueEvent(gSpring, "change", (v) => setGv(v));

  // car movement: 0 = outside (cy = 10.3), 1 = parked inside (cy = 6.9)
  const cTarget = useMotionValue(carTarget);
  const cSpring = useSpring(cTarget, { stiffness: 45, damping: 15 });
  const [cv, setCv] = useState(carTarget);
  useEffect(() => {
    cTarget.set(carTarget);
  }, [carTarget, cTarget]);
  useMotionValueEvent(cSpring, "change", (v) => setCv(v));

  // curtains accordion folding spring (0 = fully closed/stretched out, 1 = fully open/folded against walls)
  const curtTarget = useMotionValue(curtains ? 1 : 0);
  const curtSpring = useSpring(curtTarget, { stiffness: 85, damping: 18 });
  const [curtV, setCurtV] = useState(curtains ? 1 : 0);
  useEffect(() => { curtTarget.set(curtains ? 1 : 0); }, [curtains, curtTarget]);
  useMotionValueEvent(curtSpring, "change", (v) => setCurtV(v));

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // two gate leaves — free corners interpolate from the centre (closed) to inward (open)
  const H = 1.12;
  const lfx = lerp(7.4, 5.85, gv), lfy = lerp(8, 6.5, gv);
  const rfx = lerp(7.4, 8.95, gv), rfy = lerp(8, 6.5, gv);

  // colourful amplitude bars (real music waveform) around all four sides when music plays
  const musicBars: React.ReactNode[] = [];
  if (music) {
    const edges = [[0, 0, 10, 0], [10, 0, 10, 8], [10, 8, 0, 8], [0, 8, 0, 0]];
    edges.forEach((e, ei) => {
      const n = 11;
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const bx = e[0] + (e[2] - e[0]) * t, by = e[1] + (e[3] - e[1]) * t;
        const sx = CX(bx, by), sy = CY(bx, by, 0.02);
        const h = 9 + 22 * Math.abs(Math.sin(k * 1.3 + ei * 2.1));
        const hue = (k * 26 + ei * 70) % 360;
        musicBars.push(
          <rect key={`${ei}-${k}`} className="duro-eq" x={sx - 1.4} y={sy - h} width="2.8" height={h} rx="1.4"
            fill={`hsl(${hue} 88% 62%)`}
            style={{ transformBox: "fill-box", transformOrigin: "bottom", animationDelay: `${(k * 0.08 + ei * 0.15).toFixed(2)}s`, animationDuration: `${(0.66 + (k % 3) * 0.12).toFixed(2)}s` }} />
        );
      }
    });
  }

  return (
    <svg viewBox="8 10 524 365" className="h-full w-full" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="warm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,212,144,0.95)" />
          <stop offset="42%" stopColor="rgba(246,180,100,0.45)" />
          <stop offset="100%" stopColor="rgba(246,180,100,0)" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="floorWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3c2e1f" />
          <stop offset="100%" stopColor="#26190b" />
        </linearGradient>
        <linearGradient id="floorStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e2f39" />
          <stop offset="100%" stopColor="#1c1d24" />
        </linearGradient>
        <radialGradient id="tvBacklight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,184,108,0.95)" />
          <stop offset="45%" stopColor="rgba(245,150,50,0.5)" />
          <stop offset="100%" stopColor="rgba(230,120,20,0)" />
        </radialGradient>
        <linearGradient id="tvCinemaDisplay" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b1329" />
          <stop offset="35%" stopColor="#1e3a8a" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="oledOffSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#16181f" />
          <stop offset="40%" stopColor="#0a0c10" />
          <stop offset="55%" stopColor="#12141a" />
          <stop offset="100%" stopColor="#08090d" />
        </linearGradient>
        <linearGradient id="windowView" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2434" />
          <stop offset="50%" stopColor="#2c3549" />
          <stop offset="85%" stopColor="#4d3e42" />
          <stop offset="100%" stopColor="#694e46" />
        </linearGradient>
        <linearGradient id="tvOn" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b6ed0" />
          <stop offset="50%" stopColor="#2bb6bd" />
          <stop offset="100%" stopColor="#8a5fd8" />
        </linearGradient>
      </defs>

      {/* ---------- FLOORS (back to front) ---------- */}
      <Floor x0={0} y0={0} x1={5} y1={4} fill="url(#floorWood)" />
      <Floor x0={5} y0={0} x1={10} y1={2.6} fill="url(#floorStone)" />
      <Floor x0={5} y0={2.6} x1={10} y1={5.3} fill="url(#floorStone)" />
      <Floor x0={0} y0={4} x1={5} y1={8} fill="url(#floorWood)" />
      <Floor x0={5} y0={5.3} x1={10} y1={8} fill="url(#floorStone)" />
      {/* front driveway / entrance apron */}
      <polygon points={`${P(5.8, 8)} ${P(9.1, 8)} ${P(9.1, 8.9)} ${P(5.8, 8.9)}`} fill="#22242c" stroke="rgba(245,166,35,0.12)" />
      <polygon points={`${P(6.4, 8)} ${P(8.5, 8)} ${P(8.5, 8.8)} ${P(6.4, 8.8)}`} fill="none" stroke="rgba(245,166,35,0.1)" />

      {/* rugs */}
      <polygon points={`${P(0.55, 1.15)} ${P(4.35, 1.15)} ${P(4.35, 3.55)} ${P(0.55, 3.55)}`} fill="rgba(190,175,160,0.18)" stroke="rgba(245,166,35,0.32)" strokeWidth="1" />
      <polygon points={`${P(0.70, 1.30)} ${P(4.20, 1.30)} ${P(4.20, 3.40)} ${P(0.70, 3.40)}`} fill="none" stroke="rgba(245,166,35,0.18)" strokeWidth="0.8" />
      <polygon points={`${P(1.1, 5.2)} ${P(3.9, 5.2)} ${P(3.9, 7.92)} ${P(1.1, 7.92)}`} fill="rgba(160,148,168,0.15)" stroke="rgba(245,166,35,0.16)" />
      <polygon points={`${P(6.6, 6)} ${P(8.9, 6)} ${P(8.9, 7.6)} ${P(6.6, 7.6)}`} fill="rgba(160,128,96,0.13)" stroke="rgba(245,166,35,0.14)" />

      {/* ---------- WARM LIGHT POOLS + AMBIENT ---------- */}
      <g>
        <Glow x={2.4} y={2} r={112} on={lights} />
        <Glow x={7.4} y={1.3} r={82} on={lights} />
        <Glow x={7.5} y={3.9} r={92} on={lights} />
        <Glow x={2.4} y={6.6} r={108} on={lights} />
        <Glow x={7.5} y={6.7} r={84} on={lights} />
        <circle cx={CX(5, 4)} cy={CY(5, 4)} r={260} fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 0.4 : 0, transition: "opacity 900ms" }} />
      </g>
      <polygon points={`${P(0, 0)} ${P(10, 0)} ${P(10, 8)} ${P(0, 8)}`} fill="rgba(255,218,176,0.05)" style={{ mixBlendMode: "screen", pointerEvents: "none" }} />

      {/* ---------- SOLID BACK WALLS (x=0 and y=0) ---------- */}
      <Box x={0} y={0} w={10} d={0.12} h={1.7} c={WALL} />
      <Box x={0} y={0} w={0.12} d={8} h={1.7} c={WALL} />
      {/* ---------- INTERIOR PARTITION WALLS (with doorway gaps) ---------- */}
      {/* Living | Suite (y≈4) — doorway at x2.0..2.9 */}
      <Box x={0} y={3.94} w={2.0} d={0.13} h={1.05} c={WALL} />
      <Box x={2.9} y={3.94} w={2.1} d={0.13} h={1.05} c={WALL} />
      {/* central spine wall (x≈5) — doorways at y1.3..2.1 and y5.5..6.3 */}
      <Box x={4.93} y={0} w={0.13} d={1.3} h={1.05} c={WALL} />
      <Box x={4.93} y={2.1} w={0.13} d={3.4} h={1.65} c={WALL} />
      <Box x={4.93} y={6.3} w={0.13} d={1.7} h={1.05} c={WALL} />
      {/* Dining | Kitchen (y≈2.54) — doorway at x6.85..8.35 */}
      <Box x={4.93} y={2.54} w={1.92} d={0.13} h={1.05} c={WALL} />
      <Box x={8.35} y={2.54} w={1.65} d={0.13} h={1.05} c={WALL} />
      {/* Kitchen | Entry (y≈5.24) — doorway at x6.85..8.35 */}
      <Box x={4.93} y={5.24} w={1.92} d={0.13} h={1.05} c={WALL} />
      <Box x={8.35} y={5.24} w={1.65} d={0.13} h={1.05} c={WALL} />

      {/* wall art on the living-room left wall */}
      <polygon points={`${P(0.11, 1.0, 0.82)} ${P(0.11, 1.7, 0.82)} ${P(0.11, 1.7, 1.24)} ${P(0.11, 1.0, 1.24)}`} fill="#17130c" stroke="rgba(245,166,35,0.5)" strokeWidth="1" />
      <polygon points={`${P(0.11, 2.15, 0.86)} ${P(0.11, 2.95, 0.86)} ${P(0.11, 2.95, 1.2)} ${P(0.11, 2.15, 1.2)}`} fill="#191307" stroke="rgba(245,166,35,0.42)" strokeWidth="1" />

      {/* ============ LIVING (Option 2: Executive L-Shaped Charcoal Velvet Sectional) ============ */}
      {/* 1. Floor Shadows & Ambient Plinth Underglow */}
      <Shad x={0.80} y={1.50} w={1.05} d={1.85} />{/* Chaise shadow */}
      <Shad x={1.60} y={2.35} w={2.25} d={1.05} />{/* Sofa body shadow */}
      <Shad x={3.80} y={2.40} w={0.46} d={0.92} />{/* Console shadow */}

      {/* Warm LED perimeter under-glow beneath floating sectional plinth */}
      <polygon
        points={`${P(0.80, 1.55, 0.02)} ${P(1.68, 1.55, 0.02)} ${P(1.68, 2.45, 0.02)} ${P(3.80, 2.45, 0.02)} ${P(3.80, 3.32, 0.02)} ${P(0.80, 3.32, 0.02)}`}
        fill="rgba(255,185,90,0.32)"
        filter="url(#soft)"
        style={{ opacity: lights ? 0.85 : 0.2, transition: "opacity 700ms ease" }}
      />

      {/* Recessed floating dark bronze plinth base (z=0..0.12) */}
      <Box x={0.82} y={1.58} w={0.84} d={0.85} h={0.12} c={["#202129", "#16171c", "#0e0f13"]} />
      <Box x={1.66} y={2.47} w={2.12} d={0.83} h={0.12} c={["#202129", "#16171c", "#0e0f13"]} />

      {/* 2. Deep Chaise Lounge Module on Left (x=0.80..1.66, y=1.55..2.45, z=0.12..0.48) */}
      <Box x={0.80} y={1.55} w={0.86} d={0.90} h={0.36} z={0.12} c={["#353846", "#262934", "#1b1d25"]} />
      {/* Chaise front welt seam & French stitching */}
      <line x1={CX(0.80, 1.55)} y1={CY(0.80, 1.55, 0.48)} x2={CX(1.66, 1.55)} y2={CY(1.66, 1.55, 0.48)} stroke="#14151b" strokeWidth="0.8" />
      <line x1={CX(1.66, 1.55)} y1={CY(1.66, 1.55, 0.12)} x2={CX(1.66, 1.55)} y2={CY(1.66, 1.55, 0.48)} stroke="#14151b" strokeWidth="0.8" />

      {/* 3. Center & Corner Seat Modules (x=0.80..2.65, y=2.45..3.10) */}
      <Box x={0.80} y={2.45} w={1.85} d={0.65} h={0.36} z={0.12} c={["#323542", "#242630", "#1a1b22"]} />
      {/* 4. Right Seat Module (x=2.65..3.66, y=2.45..3.10) */}
      <Box x={2.65} y={2.45} w={1.01} d={0.65} h={0.36} z={0.12} c={["#303340", "#22242e", "#191a21"]} />

      {/* Seat cushion division seams */}
      <line x1={CX(1.66, 2.45)} y1={CY(1.66, 2.45, 0.48)} x2={CX(1.66, 3.10)} y2={CY(1.66, 3.10, 0.48)} stroke="#14151b" strokeWidth="0.9" />
      <line x1={CX(2.65, 2.45)} y1={CY(2.65, 2.45, 0.48)} x2={CX(2.65, 3.10)} y2={CY(2.65, 3.10, 0.48)} stroke="#14151b" strokeWidth="0.9" />
      <line x1={CX(1.66, 2.45)} y1={CY(1.66, 2.45, 0.12)} x2={CX(1.66, 2.45)} y2={CY(1.66, 2.45, 0.48)} stroke="#14151b" strokeWidth="0.8" />
      <line x1={CX(2.65, 2.45)} y1={CY(2.65, 2.45, 0.12)} x2={CX(2.65, 2.45)} y2={CY(2.65, 2.45, 0.48)} stroke="#14151b" strokeWidth="0.8" />

      {/* 5. Architectural Backrest & Armrests */}
      {/* Main Backrest carcass along back (y=3.10..3.32, x=0.68..3.66, z=0.12..0.76) */}
      <Box x={0.68} y={3.10} w={2.98} d={0.22} h={0.64} z={0.12} c={["#2b2d38", "#1f2028", "#15161c"]} />
      {/* Left Chaise low armrest / bolster (x=0.60..0.80, y=1.55..3.32, z=0.12..0.62) */}
      <Box x={0.60} y={1.55} w={0.20} d={1.77} h={0.50} z={0.12} c={["#2e303c", "#21232c", "#16171e"]} />
      {/* Right End armrest (x=3.66..3.84, y=2.45..3.32, z=0.12..0.62) */}
      <Box x={3.66} y={2.45} w={0.18} d={0.87} h={0.50} z={0.12} c={["#2e303c", "#21232c", "#16171e"]} />

      {/* Individual Plush Velvet Back Cushions (tilted forward, z=0.48..0.80) */}
      <Box x={0.90} y={2.92} w={0.80} d={0.18} h={0.32} z={0.48} c={["#3a3d4d", "#2b2d39", "#1d1f27"]} />
      <Box x={1.75} y={2.92} w={0.82} d={0.18} h={0.32} z={0.48} c={["#3a3d4d", "#2b2d39", "#1d1f27"]} />
      <Box x={2.62} y={2.92} w={0.96} d={0.18} h={0.32} z={0.48} c={["#3a3d4d", "#2b2d39", "#1d1f27"]} />
      {/* Back cushion piped top highlights */}
      <line x1={CX(0.92, 3.10)} y1={CY(0.92, 3.10, 0.80)} x2={CX(1.68, 3.10)} y2={CY(1.68, 3.10, 0.80)} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <line x1={CX(1.77, 3.10)} y1={CY(1.77, 3.10, 0.80)} x2={CX(2.55, 3.10)} y2={CY(2.55, 3.10, 0.80)} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <line x1={CX(2.64, 3.10)} y1={CY(2.64, 3.10, 0.80)} x2={CX(3.56, 3.10)} y2={CY(3.56, 3.10, 0.80)} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

      {/* 6. Integrated Fluted Dark Walnut Side Console / Drinks Ledge (x=3.84..4.24, y=2.45..3.32) */}
      <Box x={3.84} y={2.45} w={0.40} d={0.87} h={0.42} z={0.10} c={["#4a3523", "#382718", "#24180e"]} />
      {/* Fluted walnut grooves along visible right face */}
      {[2.58, 2.76, 2.94, 3.12, 3.26].map((gy, i) => (
        <line key={`w-flute-${i}`} x1={CX(4.24, gy)} y1={CY(4.24, gy, 0.10)} x2={CX(4.24, gy)} y2={CY(4.24, gy, 0.52)} stroke="#1d140b" strokeWidth="0.8" />
      ))}
      {/* Honed Nero Marquina Marble Console Top Slab */}
      <Box x={3.82} y={2.43} w={0.44} d={0.91} h={0.03} z={0.52} c={["#2c2e36", "#1f2026", "#15161b"]} />
      <line x1={CX(3.82, 3.34)} y1={CY(3.82, 3.34, 0.55)} x2={CX(4.26, 3.34)} y2={CY(4.26, 3.34, 0.55)} stroke="#c8a25f" strokeWidth="0.8" />
      {/* Sculptural brass ambient lamp on console */}
      <ellipse cx={CX(4.04, 2.65)} cy={CY(4.04, 2.65, 0.55)} rx="2.4" ry="1.2" fill="#c8a25f" />
      <circle cx={CX(4.04, 2.65)} cy={CY(4.04, 2.65, 0.63)} r="4.5" fill="#ffdf99" filter="url(#soft)" opacity={lights ? 0.9 : 0.2} />
      <circle cx={CX(4.04, 2.65)} cy={CY(4.04, 2.65, 0.63)} r="2" fill="#fff5d6" />
      {/* Crystal rocks glass with amber whiskey */}
      <rect x={CX(4.04, 3.05) - 1.2} y={CY(4.04, 3.05, 0.55) - 4} width="2.4" height="4" rx="0.5" fill="rgba(215,160,80,0.85)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />

      {/* 7. Folded Ivory Cashmere Throw & Designer Accent Cushions */}
      {/* Folded Cashmere Throw draped across Chaise end (x=0.85..1.60, y=1.58..1.92) */}
      <Box x={0.85} y={1.58} w={0.75} d={0.34} h={0.04} z={0.48} c={["#f2ede4", "#dbd4c7", "#b8afa0"]} />
      <line x1={CX(0.85, 1.58)} y1={CY(0.85, 1.58, 0.48)} x2={CX(1.60, 1.58)} y2={CY(1.60, 1.58, 0.48)} stroke="#c8a25f" strokeWidth="0.9" strokeDasharray="1.2 1.2" />
      {/* Pillow 1: Warm Cream Textured Bouclé Cushion on Chaise */}
      <Box x={1.05} y={2.10} w={0.44} d={0.22} h={0.22} z={0.48} c={["#faf6f0", "#e0d9cd", "#b8b0a2"]} />
      {/* Pillow 2: Rich Cognac Saddle Leather Cushion at Corner */}
      <Box x={1.68} y={2.75} w={0.42} d={0.20} h={0.20} z={0.48} c={["#b8642a", "#964c1b", "#733610"]} />
      {/* Pillow 3: Geometric Charcoal & Ivory Jacquard Cushion */}
      <Box x={2.45} y={2.75} w={0.40} d={0.18} h={0.18} z={0.48} c={["#484c5c", "#373a48", "#272a34"]} />
      {/* Pillow 4: Cognac Leather Lumbar Cushion */}
      <Box x={3.15} y={2.78} w={0.36} d={0.16} h={0.14} z={0.48} c={["#b8642a", "#964c1b", "#733610"]} />

      {/* 8. Bespoke Dual-Tier Dark Quartzite & Bronze Coffee Table (Nestled inside L-Shape, x=2.00..3.25, y=1.45..2.15) */}
      <Shad x={2.00} y={1.45} w={1.25} d={0.70} />
      {/* Lower tier recessed bronze plinth */}
      <Box x={2.12} y={1.55} w={1.00} d={0.50} h={0.12} c={["#35291b", "#271e13", "#19130b"]} />
      {/* Lower tier honed dark quartzite slab (z=0.12..0.18) */}
      <Box x={2.00} y={1.45} w={1.25} d={0.70} h={0.06} z={0.12} c={["#2d303a", "#21232b", "#16171d"]} />
      <line x1={CX(2.00, 2.15)} y1={CY(2.00, 2.15, 0.18)} x2={CX(3.25, 2.15)} y2={CY(3.25, 2.15, 0.18)} stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      {/* Open luxury architectural art monograph book on table */}
      <polygon points={`${P(2.18, 1.62, 0.18)} ${P(2.38, 1.62, 0.18)} ${P(2.38, 1.84, 0.18)} ${P(2.18, 1.84, 0.18)}`} fill="#f5f0e8" stroke="#1c1d22" strokeWidth="0.5" />
      <line x1={CX(2.28, 1.62)} y1={CY(2.28, 1.62, 0.18)} x2={CX(2.28, 1.84)} y2={CY(2.28, 1.84, 0.18)} stroke="#dc2626" strokeWidth="0.6" />
      {/* Sculptural bronze catchall bowl */}
      <circle cx={CX(2.58, 1.82)} cy={CY(2.58, 1.82, 0.19)} r="3.2" fill="#c8a25f" stroke="#876527" strokeWidth="0.5" />
      {/* Upper floating smoked glass & fluted bronze cocktail tier (elevated at z=0.25) */}
      <Box x={2.82} y={1.52} w={0.16} d={0.16} h={0.07} z={0.18} c={["#9e7b3c", "#7b5e28", "#59431b"]} />{/* bronze pedestal */}
      <ellipse cx={CX(2.90, 1.60)} cy={CY(2.90, 1.60, 0.25)} rx="14" ry="7" fill="rgba(35,32,28,0.55)" stroke="rgba(200,162,95,0.75)" strokeWidth="0.9" />
      {/* Frosted glass candle with golden flame on upper tier */}
      <rect x={CX(2.90, 1.60) - 1.2} y={CY(2.90, 1.60, 0.25) - 5} width="2.4" height="5" rx="0.6" fill="rgba(240,230,215,0.75)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
      <circle cx={CX(2.90, 1.60)} cy={CY(2.90, 1.60, 0.32)} r="1.1" fill={lights ? "#facc15" : "#785010"} style={{ transition: "fill 500ms" }} />
      {lights && <circle cx={CX(2.90, 1.60)} cy={CY(2.90, 1.60, 0.32)} r="3" fill="#facc15" opacity="0.3" filter="url(#soft)" />}
      {/* ============ TV ENTERTAINMENT CENTER (Option 1: Acoustic Fluted Walnut & Backlit OLED) ============ */}
      {/* 1. Acoustic Wall Panel with Vertical Fluted Walnut Wood Slats */}
      <g id="acoustic-wall-panel">
        {/* Dark acoustic felt backing panel */}
        <polygon
          points={`${P(1.15, 0.122, 0.08)} ${P(3.05, 0.122, 0.08)} ${P(3.05, 0.122, 1.62)} ${P(1.15, 0.122, 1.62)}`}
          fill="#141312"
          stroke="#262320"
          strokeWidth="0.8"
        />
        {/* 17 vertical fluted walnut wood slats */}
        {Array.from({ length: 17 }).map((_, i) => {
          const sx = 1.18 + i * 0.108;
          const slatTone = i % 3 === 0 ? "#7a5535" : i % 3 === 1 ? "#6c492d" : "#5d3e24";
          return (
            <g key={`walnut-slat-${i}`}>
              {/* shadow groove behind slat */}
              <line
                x1={CX(sx - 0.012, 0.123)}
                y1={CY(sx - 0.012, 0.123, 0.08)}
                x2={CX(sx - 0.012, 0.123)}
                y2={CY(sx - 0.012, 0.123, 1.62)}
                stroke="#090807"
                strokeWidth="1.2"
              />
              {/* slat front face (+y face) */}
              <polygon
                points={`${P(sx, 0.138, 0.08)} ${P(sx + 0.048, 0.138, 0.08)} ${P(sx + 0.048, 0.138, 1.62)} ${P(sx, 0.138, 1.62)}`}
                fill={slatTone}
              />
              {/* slat right edge (+x face) */}
              <polygon
                points={`${P(sx + 0.048, 0.124, 0.08)} ${P(sx + 0.048, 0.138, 0.08)} ${P(sx + 0.048, 0.138, 1.62)} ${P(sx + 0.048, 0.124, 1.62)}`}
                fill="#3b2615"
              />
              {/* slat top edge (+z face) */}
              <polygon
                points={`${P(sx, 0.124, 1.62)} ${P(sx + 0.048, 0.124, 1.62)} ${P(sx + 0.048, 0.138, 1.62)} ${P(sx, 0.138, 1.62)}`}
                fill="#8f6440"
              />
            </g>
          );
        })}
      </g>

      {/* 2. True 16:9 Cinema OLED Display (width 1.40, height 0.78) */}
      {/* TV chassis & slim wall mount */}
      <Box x={1.38} y={0.152} w={1.44} d={0.02} h={0.80} z={0.57} c={["#1c1d22", "#131418", "#0b0c0e"]} />
      {/* Outer metallic bezel with subtle gold hairline rim */}
      <polygon
        points={`${P(1.38, 0.174, 0.57)} ${P(2.82, 0.174, 0.57)} ${P(2.82, 0.174, 1.37)} ${P(1.38, 0.174, 1.37)}`}
        fill="#0b0d12"
        stroke="rgba(245,166,35,0.4)"
        strokeWidth="0.8"
      />
      {/* OLED display screen */}
      <polygon
        points={`${P(1.40, 0.176, 0.59)} ${P(2.80, 0.176, 0.59)} ${P(2.80, 0.176, 1.35)} ${P(1.40, 0.176, 1.35)}`}
        fill={tv ? "url(#tvCinemaDisplay)" : "url(#oledOffSheen)"}
        style={{ transition: "fill 500ms" }}
      />

      {/* When TV is ON: Cinematic 4K display graphics & UI (strictly contained within screen) */}
      {tv && (
        <g style={{ pointerEvents: "none" }}>
          {/* Radiant mountain sunset / horizon graphic */}
          <polygon
            points={`${P(1.40, 0.177, 0.59)} ${P(2.80, 0.177, 0.59)} ${P(2.80, 0.177, 0.94)} ${P(2.26, 0.177, 1.08)} ${P(1.78, 0.177, 0.84)} ${P(1.40, 0.177, 0.96)}`}
            fill="rgba(236,72,153,0.45)"
          />
          {/* Ambient sun inside screen */}
          <circle
            cx={CX(2.36, 0.177)}
            cy={CY(2.36, 0.177, 1.12)}
            r="4.5"
            fill="#fef08a"
            opacity="0.95"
          />
          <circle
            cx={CX(2.36, 0.177)}
            cy={CY(2.36, 0.177, 1.12)}
            r="2.2"
            fill="#ffffff"
            opacity="0.95"
          />

          {/* Playback progress scrubber bar */}
          <line
            x1={CX(1.46, 0.177)}
            y1={CY(1.46, 0.177, 0.63)}
            x2={CX(2.74, 0.177)}
            y2={CY(2.74, 0.177, 0.63)}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.8"
          />
          <line
            x1={CX(1.46, 0.177)}
            y1={CY(1.46, 0.177, 0.63)}
            x2={CX(2.18, 0.177)}
            y2={CY(2.18, 0.177, 0.63)}
            stroke="#38bdf8"
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* When TV is OFF: Glass reflection sheen */}
      {!tv && (
        <polygon
          points={`${P(1.40, 0.177, 1.35)} ${P(1.92, 0.177, 1.35)} ${P(1.40, 0.177, 0.72)}`}
          fill="rgba(255,255,255,0.06)"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Standby LED status indicator */}
      <circle
        cx={CX(2.10, 0.178)}
        cy={CY(2.10, 0.178, 0.575)}
        r="1"
        fill={tv ? "#22c55e" : "#eab308"}
        opacity="0.9"
      />

      {/* 3. Floating Walnut & Dark Stone Media Console */}
      {/* Floor contact shadow under floating console */}
      <Shad x={1.2} y={0.22} w={1.8} d={0.34} />

      {/* Warm horizontal under-glow LED strip onto floor (linked to room lights only) */}
      <polygon
        points={`${P(1.24, 0.20, 0.02)} ${P(2.96, 0.20, 0.02)} ${P(2.96, 0.52, 0.02)} ${P(1.24, 0.52, 0.02)}`}
        fill="rgba(245,166,35,0.32)"
        filter="url(#soft)"
        style={{
          opacity: lights ? 0.35 : 0,
          transition: "opacity 600ms ease",
        }}
      />

      {/* Floating Walnut Cabinet Body (elevated at z = 0.16) */}
      <Box x={1.22} y={0.16} w={1.76} d={0.34} h={0.24} z={0.16} c={["#6d4b2e", "#533821", "#3b2615"]} />
      {/* Front cabinet drawer seams */}
      <line x1={CX(1.80, 0.50)} y1={CY(1.80, 0.50, 0.16)} x2={CX(1.80, 0.50)} y2={CY(1.80, 0.50, 0.40)} stroke="#2b1a0d" strokeWidth="1" />
      <line x1={CX(2.40, 0.50)} y1={CY(2.40, 0.50, 0.16)} x2={CX(2.40, 0.50)} y2={CY(2.40, 0.50, 0.40)} stroke="#2b1a0d" strokeWidth="1" />
      {/* Minimalist brass handles */}
      <line x1={CX(1.46, 0.502)} y1={CY(1.46, 0.502, 0.35)} x2={CX(1.56, 0.502)} y2={CY(1.56, 0.502, 0.35)} stroke="#c8a25f" strokeWidth="1.2" />
      <line x1={CX(2.05, 0.502)} y1={CY(2.05, 0.502, 0.35)} x2={CX(2.15, 0.502)} y2={CY(2.15, 0.502, 0.35)} stroke="#c8a25f" strokeWidth="1.2" />
      <line x1={CX(2.64, 0.502)} y1={CY(2.64, 0.502, 0.35)} x2={CX(2.74, 0.502)} y2={CY(2.74, 0.502, 0.35)} stroke="#c8a25f" strokeWidth="1.2" />

      {/* Nero Marquina / Slate Dark Stone Top Slab (z = 0.40 to 0.43) */}
      <Box x={1.20} y={0.15} w={1.80} d={0.36} h={0.03} z={0.40} c={["#353740", "#272830", "#1a1b22"]} />
      {/* Brass edge rim accent along front of stone top */}
      <line x1={CX(1.20, 0.51)} y1={CY(1.20, 0.51, 0.43)} x2={CX(3.00, 0.51)} y2={CY(3.00, 0.51, 0.43)} stroke="rgba(245,166,35,0.45)" strokeWidth="0.8" />

      {/* 5. Matte Black Slim Soundbar with acoustic grille & status LED */}
      <Box x={1.62} y={0.28} w={0.96} d={0.12} h={0.05} z={0.43} c={["#202228", "#17181e", "#0f1014"]} />
      {/* Speaker micro-mesh line */}
      <line
        x1={CX(1.66, 0.402)}
        y1={CY(1.66, 0.402, 0.455)}
        x2={CX(2.54, 0.402)}
        y2={CY(2.54, 0.402, 0.455)}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
        strokeDasharray="1.5 1.5"
      />
      {/* Soundbar status indicator LED */}
      <circle
        cx={CX(2.10, 0.402)}
        cy={CY(2.10, 0.402, 0.455)}
        r="1"
        fill={tv || music ? "#00f2fe" : "#71717a"}
      />

      {/* 6. Curated Console Decor: Ceramic vase & design books */}
      {/* Left: Minimal matte cream ceramic vase with botanical reed */}
      <Box x={1.32} y={0.29} w={0.12} d={0.12} h={0.16} z={0.43} c={CREAM} />
      <line x1={CX(1.38, 0.35)} y1={CY(1.38, 0.35, 0.59)} x2={CX(1.36, 0.35)} y2={CY(1.36, 0.35, 0.72)} stroke="#a89279" strokeWidth="0.9" />
      <line x1={CX(1.38, 0.35)} y1={CY(1.38, 0.35, 0.59)} x2={CX(1.42, 0.35)} y2={CY(1.42, 0.35, 0.69)} stroke="#c2a78b" strokeWidth="0.9" />
      {/* Right: Stacked hardcover art/architecture books */}
      <Box x={2.70} y={0.28} w={0.22} d={0.16} h={0.035} z={0.43} c={["#475569", "#334155", "#1e293b"]} />
      <Box x={2.72} y={0.30} w={0.18} d={0.14} h={0.03} z={0.465} c={["#b45309", "#92400e", "#78350f"]} />
      <Box x={0.4} y={0.5} w={0.2} d={0.2} h={1.5} c={METAL} />{/* floor lamp */}
      <ellipse cx={CX(0.5, 0.6)} cy={CY(0.5, 0.6, 1.5)} rx="17" ry="10" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 1 : 0, transition: "opacity 700ms" }} />
      {/* ceiling fan — Aero Minimalist 3-blade flushmount design */}
      <ellipse
        cx={CX(2.5, 1.85)}
        cy={CY(2.5, 1.85, 0)}
        rx="26"
        ry="13"
        fill="rgba(0,0,0,0.22)"
        filter="url(#soft)"
      />
      <g transform={`translate(${CX(2.5, 1.85)} ${CY(2.5, 1.85, 1.62)})`}>
        {/* warm light pool on floor/table below when lights on */}
        <ellipse
          cx="0"
          cy="10"
          rx="38"
          ry="19"
          fill="url(#warm)"
          style={{ mixBlendMode: "screen", opacity: lights ? 0.65 : 0, transition: "opacity 700ms" }}
        />

        {/* isometric horizontal plane */}
        <g transform="scale(1, 0.577)">
          {/* rotating fan assembly */}
          <g
            className={fan ? "duro-fan" : ""}
            style={{
              transformOrigin: "0px 0px",
              animationDuration: fanSpeed === "low" ? "2.6s" : fanSpeed === "high" ? "0.65s" : "1.3s",
            }}
          >
            {/* 3 aerodynamic sculpted blades at 120° angles */}
            {[0, 120, 240].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                {/* blade shadow / depth underneath */}
                <path
                  d="M 6,-1.2 C 14,-2.8 24,-4.2 36,-1.5 C 38.5,-0.9 39,1.4 36.5,2.1 C 24,4.6 14,3.4 6,1.8 Z"
                  fill="#0c0c10"
                  opacity="0.85"
                />
                {/* main blade body — matte charcoal/black */}
                <path
                  d="M 6,-1.6 C 14,-3.2 24,-4.6 36,-1.8 C 38.5,-1.2 39,1.2 36.5,1.8 C 24,4.2 14,3.0 6,1.4 Z"
                  fill="#1b1b22"
                  stroke="#101014"
                  strokeWidth="0.6"
                />
                {/* upper aerodynamic highlight camber */}
                <path
                  d="M 8,-0.6 C 16,-1.8 25,-2.6 35,-1.0"
                  fill="none"
                  stroke="#383846"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
                {/* blade root brass accent bracket */}
                <rect x="5.5" y="-1.2" width="2.8" height="2.4" rx="0.6" fill="#F5A623" stroke="#b87a15" strokeWidth="0.4" />
              </g>
            ))}

            {/* center motor housing: brushed brass outer rim */}
            <circle r="8.2" fill="#F5A623" stroke="#b87a15" strokeWidth="0.8" />
            {/* architectural dark motor cylinder */}
            <circle r="6.4" fill="#18181f" stroke="#2c2c36" strokeWidth="0.6" />
            {/* inner brass bezel */}
            <circle r="4" fill="#d49220" />
            {/* center LED dome / polished hub */}
            <circle
              r="2.5"
              fill={lights ? "#fff4dc" : "#221c12"}
              stroke={lights ? "#F5A623" : "#5a4520"}
              strokeWidth="0.5"
              style={{ transition: "fill 500ms" }}
            />
            {lights && (
              <circle r="5" fill="#F5A623" opacity="0.35" style={{ mixBlendMode: "screen" }} />
            )}
          </g>
        </g>

        {/* Stationary vertical downrod & ceiling canopy — anchored directly to the center hub */}
        {/* Ceiling canopy mount at ceiling level */}
        <g transform="translate(0, -14)">
          <ellipse cx="0" cy="0" rx="4" ry="2" fill="#1c1c24" stroke="#d49220" strokeWidth="0.6" />
          <path d="M -3.8,0 C -3.8,1.6 -2.6,3.0 -1.6,3.8 L 1.6,3.8 C 2.6,3.0 3.8,1.6 3.8,0 Z" fill="#b87a15" />
          <path d="M -1.8,0 C -1.8,1.4 -1.2,2.8 -0.6,3.8 L 0.8,3.8 C 1.4,2.8 1.8,1.4 1.8,0 Z" fill="#F5A623" />
          <ellipse cx="0" cy="3.8" rx="1.6" ry="0.8" fill="#7a500a" />
        </g>

        {/* Shaded metallic downrod connecting ceiling canopy down to center motor collar */}
        <line x1="-0.9" y1="-10.2" x2="-0.9" y2="-1.2" stroke="#684206" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="0" y1="-10.2" x2="0" y2="-1.2" stroke="#F5A623" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="0.5" y1="-10.2" x2="0.5" y2="-1.2" stroke="#ffe08a" strokeWidth="0.5" strokeLinecap="round" />

        {/* Motor top mounting collar at center hub */}
        <ellipse cx="0" cy="-1.5" rx="2.6" ry="1.3" fill="#a87212" stroke="#5a3806" strokeWidth="0.4" />
        <ellipse cx="0" cy="-1.8" rx="2.1" ry="1.0" fill="#F7B94D" />
        <ellipse cx="0" cy="-1.8" rx="1.1" ry="0.6" fill="#2a1f10" />
      </g>
      {/* wall-mounted split AC + cool air (stronger when temp is lower) */}
      <Box x={3.0} y={0.12} w={1.3} d={0.16} h={0.34} z={1.08} c={["#eceef2", "#d2d5db", "#b5b8bf"]} />
      <polygon points={`${P(3.03, 0.12, 1.1)} ${P(4.27, 0.12, 1.1)} ${P(4.27, 0.12, 1.14)} ${P(3.03, 0.12, 1.14)}`} fill="rgba(120,180,215,0.55)" />
      <g style={{ opacity: coolI }}>
        {[0, 1, 2].map((i) => (
          <rect key={i} className="duro-cool" x={CX(3.35 + i * 0.35, 0.26)} y={CY(3.35 + i * 0.35, 0.26, 1.02)} width="2" height="10" rx="1" fill="rgba(155,205,235,0.9)" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
      </g>

      {/* ============ DINING (Option 4: Smoked Glass Vitrine & Bronze Cantilever Penthouse) ============ */}
      {/* 1. Fluted Dark Oak Floating Credenza & Illuminated Back Vitrine along y=0.13 Wall */}
      <Box x={7.15} y={0.13} w={1.70} d={0.28} h={0.52} c={["#423223", "#322417", "#22170d"]} />{/* fluted dark oak body */}
      <Box x={7.13} y={0.12} w={1.74} d={0.30} h={0.03} z={0.52} c={["#2b2d35", "#1f2026", "#14151a"]} />{/* stone top */}
      <line x1={CX(7.13, 0.41)} y1={CY(7.13, 0.41, 0.55)} x2={CX(8.87, 0.41)} y2={CY(8.87, 0.41, 0.55)} stroke="rgba(245,166,35,0.45)" strokeWidth="0.8" />
      {/* Fluted front grooves on credenza */}
      {[7.45, 7.80, 8.15, 8.50].map((gx, i) => (
        <line key={`cred-g-${i}`} x1={CX(gx, 0.41)} y1={CY(gx, 0.41, 0.05)} x2={CX(gx, 0.41)} y2={CY(gx, 0.41, 0.52)} stroke="#19130c" strokeWidth="0.9" />
      ))}
      {/* Bronze handle accents */}
      <line x1={CX(7.45, 0.415)} y1={CY(7.45, 0.415, 0.38)} x2={CX(7.55, 0.415)} y2={CY(7.55, 0.415, 0.38)} stroke="#c8a25f" strokeWidth="1.2" />
      <line x1={CX(8.40, 0.415)} y1={CY(8.40, 0.415, 0.38)} x2={CX(8.50, 0.415)} y2={CY(8.50, 0.415, 0.38)} stroke="#c8a25f" strokeWidth="1.2" />

      {/* Wall Wine & Stemware Vitrine Rack above Credenza (y=0.13, z=0.72..1.48) */}
      <g id="dining-vitrine">
        {/* Dark mirrored acoustic backing */}
        <polygon
          points={`${P(7.25, 0.13, 0.72)} ${P(8.75, 0.13, 0.72)} ${P(8.75, 0.13, 1.48)} ${P(7.25, 0.13, 1.48)}`}
          fill="#13141a"
          stroke="rgba(245,166,35,0.45)"
          strokeWidth="1"
        />
        {/* Soft internal cove backglow */}
        <polygon
          points={`${P(7.27, 0.13, 0.74)} ${P(8.73, 0.13, 0.74)} ${P(8.73, 0.13, 1.46)} ${P(7.27, 0.13, 1.46)}`}
          fill="rgba(255,200,120,0.12)"
          filter="url(#soft)"
          style={{ opacity: lights ? 1 : 0.2, transition: "opacity 700ms" }}
        />
        {/* Illuminated bronze glass display shelves */}
        {[0.94, 1.18].map((sz, idx) => (
          <g key={`din-shelf-${idx}`}>
            <line
              x1={CX(7.25, 0.13)}
              y1={CY(7.25, 0.13, sz)}
              x2={CX(8.75, 0.13)}
              y2={CY(8.75, 0.13, sz)}
              stroke="rgba(255,210,140,0.75)"
              strokeWidth="1.2"
            />
            {/* Shelf LED downwash glow */}
            <polygon
              points={`${P(7.25, 0.13, sz)} ${P(8.75, 0.13, sz)} ${P(8.75, 0.13, sz - 0.08)} ${P(7.25, 0.13, sz - 0.08)}`}
              fill="rgba(255,200,120,0.15)"
              filter="url(#soft)"
            />
          </g>
        ))}
        {/* Display glassware and bottles on shelves */}
        {[7.40, 7.65, 8.05, 8.35, 8.60].map((bx, i) => (
          <rect
            key={`din-bot-${i}`}
            x={CX(bx, 0.135) - 1.5}
            y={CY(bx, 0.135, 1.18) - 7}
            width="3"
            height="7"
            rx="0.8"
            fill={i % 2 === 0 ? "rgba(180,140,80,0.75)" : "rgba(80,120,160,0.65)"}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.4"
          />
        ))}
        {/* Top shelf decorative ceramics */}
        {[7.50, 8.00, 8.50].map((cx, i) => (
          <circle
            key={`din-vase-${i}`}
            cx={CX(cx, 0.135)}
            cy={CY(cx, 0.135, 1.34)}
            r="3"
            fill="#ded7cc"
            stroke="#9f9687"
            strokeWidth="0.5"
          />
        ))}
        {/* Vertical bronze vitrine mullions */}
        <line x1={CX(7.75, 0.13)} y1={CY(7.75, 0.13, 0.72)} x2={CX(7.75, 0.13)} y2={CY(7.75, 0.13, 1.48)} stroke="#a68344" strokeWidth="0.8" />
        <line x1={CX(8.25, 0.13)} y1={CY(8.25, 0.13, 0.72)} x2={CX(8.25, 0.13)} y2={CY(8.25, 0.13, 1.48)} stroke="#a68344" strokeWidth="0.8" />
      </g>

      {/* 2. Top Chairs (y=0.48..0.80, generous clearance from credenza at y=0.41) */}
      {[7.05, 7.95].map((cx, i) => (
        <g key={`chair-top-${i}`}>
          {/* Bronze slender legs */}
          <line x1={CX(cx - 0.12, 0.56)} y1={CY(cx - 0.12, 0.56, 0)} x2={CX(cx - 0.12, 0.56)} y2={CY(cx - 0.12, 0.56, 0.38)} stroke="#9e7c3b" strokeWidth="1" />
          <line x1={CX(cx + 0.12, 0.56)} y1={CY(cx + 0.12, 0.56, 0)} x2={CX(cx + 0.12, 0.56)} y2={CY(cx + 0.12, 0.56, 0.38)} stroke="#9e7c3b" strokeWidth="1" />
          {/* Taupe velvet curved seat cushion */}
          <Box x={cx - 0.18} y={0.52} w={0.36} d={0.32} h={0.10} z={0.38} c={["#6a6358", "#534d43", "#3d3830"]} />
          {/* Curved ergonomic backrest */}
          <Box x={cx - 0.18} y={0.48} w={0.36} d={0.08} h={0.24} z={0.48} c={["#585248", "#443f36", "#322d26"]} />
        </g>
      ))}
      {/* Left end captain chair */}
      <g id="chair-end-left">
        <line x1={CX(6.22, 1.20)} y1={CY(6.22, 1.20, 0)} x2={CX(6.22, 1.20)} y2={CY(6.22, 1.20, 0.38)} stroke="#9e7c3b" strokeWidth="1" />
        <Box x={6.12} y={1.05} w={0.30} d={0.34} h={0.10} z={0.38} c={["#6a6358", "#534d43", "#3d3830"]} />
        <Box x={6.08} y={1.05} w={0.08} d={0.34} h={0.24} z={0.48} c={["#585248", "#443f36", "#322d26"]} />
      </g>

      {/* 3. Contemporary Smoked Glass & Bronze Dining Table (Centered with open perimeter) */}
      {/* Floor contact shadow */}
      <Shad x={6.48} y={0.80} w={1.94} d={0.84} />
      {/* Sculptural brushed bronze architectural pedestal bases */}
      <Box x={6.88} y={1.07} w={0.22} d={0.28} h={0.46} c={["#bfa063", "#9d8048", "#785f30"]} />
      <Box x={7.88} y={1.07} w={0.22} d={0.28} h={0.46} c={["#bfa063", "#9d8048", "#785f30"]} />
      {/* Dark granite table foundation slab */}
      <Box x={6.52} y={0.82} w={1.86} d={0.76} h={0.04} z={0.46} c={["#2b2d35", "#1f2026", "#14151a"]} />
      {/* Smoked glass tabletop with champagne bronze edge trim */}
      <polygon
        points={`${P(6.50, 0.80, 0.50)} ${P(8.40, 0.80, 0.50)} ${P(8.40, 1.62, 0.50)} ${P(6.50, 1.62, 0.50)}`}
        fill="rgba(34,38,48,0.78)"
        stroke="rgba(245,166,35,0.55)"
        strokeWidth="1.1"
      />
      {/* Glass surface reflection sheen */}
      <polygon
        points={`${P(6.65, 0.90, 0.50)} ${P(8.25, 0.90, 0.50)} ${P(8.05, 1.40, 0.50)} ${P(6.80, 1.40, 0.50)}`}
        fill="rgba(255,255,255,0.06)"
      />
      {/* Tabletop centerpiece: Sculptural bronze bowl with citrus & smoked glass vase */}
      <Box x={7.40} y={1.12} w={0.24} d={0.18} h={0.06} z={0.50} c={["#c8a25f", "#a68344", "#7b5e28"]} />
      <circle cx={CX(7.50, 1.21)} cy={CY(7.50, 1.21, 0.58)} r="1.8" fill="#eab308" />
      <circle cx={CX(7.68, 1.23)} cy={CY(7.68, 1.23, 0.58)} r="2.2" fill="rgba(120,180,210,0.6)" stroke="#ffffff" strokeWidth="0.4" />

      {/* 4. Bottom Chairs (y=1.62..1.94, free-standing in open space, no walls nearby) & Right End Chair */}
      {[7.05, 7.95].map((cx, i) => (
        <g key={`chair-bot-${i}`}>
          {/* Bronze legs */}
          <line x1={CX(cx - 0.12, 1.68)} y1={CY(cx - 0.12, 1.68, 0)} x2={CX(cx - 0.12, 1.68)} y2={CY(cx - 0.12, 1.68, 0.38)} stroke="#9e7c3b" strokeWidth="1" />
          <line x1={CX(cx + 0.12, 1.68)} y1={CY(cx + 0.12, 1.68, 0)} x2={CX(cx + 0.12, 1.68)} y2={CY(cx + 0.12, 1.68, 0.38)} stroke="#9e7c3b" strokeWidth="1" />
          {/* Taupe velvet seat cushion */}
          <Box x={cx - 0.18} y={1.62} w={0.36} d={0.32} h={0.10} z={0.38} c={["#6a6358", "#534d43", "#3d3830"]} />
          {/* Low curved backrest */}
          <Box x={cx - 0.18} y={1.86} w={0.36} d={0.08} h={0.22} z={0.48} c={["#585248", "#443f36", "#322d26"]} />
        </g>
      ))}
      {/* Right end captain chair */}
      <g id="chair-end-right">
        <line x1={CX(8.68, 1.20)} y1={CY(8.68, 1.20, 0)} x2={CX(8.68, 1.20)} y2={CY(8.68, 1.20, 0.38)} stroke="#9e7c3b" strokeWidth="1" />
        <Box x={8.48} y={1.05} w={0.30} d={0.34} h={0.10} z={0.38} c={["#6a6358", "#534d43", "#3d3830"]} />
        <Box x={8.74} y={1.05} w={0.08} d={0.34} h={0.24} z={0.48} c={["#585248", "#443f36", "#322d26"]} />
      </g>

      {/* 5. Architectural Bronze Ring Chandelier over Dining Table */}
      <g id="dining-chandelier">
        <line x1={CX(7.45, 1.20)} y1={CY(7.45, 1.20, 1.85)} x2={CX(7.45, 1.20)} y2={CY(7.45, 1.20, 1.45)} stroke="rgba(245,166,35,0.4)" strokeWidth="0.9" />
        <circle cx={CX(7.45, 1.20)} cy={CY(7.45, 1.20, 1.45)} r="26" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 0.85 : 0, transition: "opacity 700ms" }} />
        {/* Sculptural nested glowing bronze halo rings */}
        <ellipse cx={CX(7.45, 1.20)} cy={CY(7.45, 1.20, 1.46)} rx="18" ry="10" fill="none" stroke={lights ? "#fcd34d" : "#785f30"} strokeWidth="1.6" />
        <ellipse cx={CX(7.45, 1.20)} cy={CY(7.45, 1.20, 1.38)} rx="12" ry="7" fill="none" stroke={lights ? "#fef08a" : "#604723"} strokeWidth="1.4" />
      </g>

      {/* ============ KITCHEN (Option 4: Smoked Glass Vitrine & Bronze Cantilever Penthouse) ============ */}
      {/* 1. Base Wall Counter with Integrated Cooktop & Bronze Gooseneck Faucet (x=5.22..5.92, y=2.85..4.15, 0.18m clearance from stub wall) */}
      <Box x={5.22} y={2.85} w={0.70} d={1.30} h={0.85} c={["#352b20", "#261d15", "#18120c"]} />{/* espresso body */}
      <Box x={5.20} y={2.83} w={0.74} d={1.34} h={0.04} z={0.85} c={["#2c2f38", "#20222a", "#15171d"]} />{/* dark stone top */}
      {/* Integrated flush induction cooktop with indicator rings */}
      <polygon
        points={`${P(5.32, 2.96, 0.89)} ${P(5.80, 2.96, 0.89)} ${P(5.80, 3.48, 0.89)} ${P(5.32, 3.48, 0.89)}`}
        fill="#111216"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.6"
      />
      <circle cx={CX(5.56, 3.12)} cy={CY(5.56, 3.12, 0.89)} r="2.5" fill="none" stroke="rgba(245,166,35,0.4)" strokeWidth="0.6" />
      <circle cx={CX(5.56, 3.32)} cy={CY(5.56, 3.32, 0.89)} r="2.5" fill="none" stroke="rgba(245,166,35,0.4)" strokeWidth="0.6" />
      {/* Under-mount dark granite sink & architectural bronze gooseneck faucet */}
      <polygon
        points={`${P(5.34, 3.65, 0.89)} ${P(5.78, 3.65, 0.89)} ${P(5.78, 4.05, 0.89)} ${P(5.34, 4.05, 0.89)}`}
        fill="#14151a"
        stroke="#272832"
        strokeWidth="0.8"
      />
      {/* Bronze gooseneck tap */}
      <path
        d={`M ${CX(5.40, 3.85)} ${CY(5.40, 3.85, 0.89)} L ${CX(5.40, 3.85)} ${CY(5.40, 3.85, 1.04)} Q ${CX(5.46, 3.85)} ${CY(5.46, 3.85, 1.08)} ${CX(5.53, 3.85)} ${CY(5.53, 3.85, 1.01)}`}
        fill="none"
        stroke="#c8a25f"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* 2. Grand Smoked Glass Wine & Bar Vitrine Wall Rack (Elevated at z=1.18..1.74, y=2.85..4.15) */}
      <g id="kitchen-vitrine-rack">
        {/* Dark mirrored carcass backing along spine wall */}
        <polygon
          points={`${P(5.22, 2.85, 1.18)} ${P(5.22, 4.15, 1.18)} ${P(5.22, 4.15, 1.74)} ${P(5.22, 2.85, 1.74)}`}
          fill="#13141a"
          stroke="#272420"
          strokeWidth="0.8"
        />
        {/* Upper cabinet main body */}
        <Box x={5.22} y={2.85} w={0.38} d={1.30} h={0.56} z={1.18} c={["#352b20", "#261d15", "#18120c"]} />
        {/* Warm internal amber illumination in vitrine */}
        <polygon
          points={`${P(5.24, 2.88, 1.20)} ${P(5.24, 4.12, 1.20)} ${P(5.24, 4.12, 1.72)} ${P(5.24, 2.88, 1.72)}`}
          fill="rgba(255,190,100,0.18)"
          filter="url(#soft)"
          style={{ opacity: lights ? 1 : 0.2, transition: "opacity 700ms" }}
        />
        {/* 2 Horizontal edge-lit glass display shelves with bronze trim */}
        {[1.36, 1.54].map((sz, idx) => (
          <g key={`k-shelf-${idx}`}>
            <line
              x1={CX(5.60, 2.85)}
              y1={CY(5.60, 2.85, sz)}
              x2={CX(5.60, 4.15)}
              y2={CY(5.60, 4.15, sz)}
              stroke="rgba(255,200,120,0.85)"
              strokeWidth="1.2"
            />
            {/* Shelf soft glow */}
            <polygon
              points={`${P(5.60, 2.85, sz)} ${P(5.60, 4.15, sz)} ${P(5.60, 4.15, sz - 0.06)} ${P(5.60, 2.85, sz - 0.06)}`}
              fill="rgba(255,190,100,0.15)"
              filter="url(#soft)"
            />
          </g>
        ))}
        {/* Illuminated wine bottles & luxury glassware inside vitrine */}
        {[3.05, 3.35, 3.68, 3.96].map((wy, idx) => (
          <g key={`k-bot-${idx}`}>
            <rect
              x={CX(5.42, wy) - 1.2}
              y={CY(5.42, wy, 1.36) - 7}
              width="2.4"
              height="7"
              rx="0.6"
              fill={idx % 2 === 0 ? "rgba(190,150,80,0.85)" : "rgba(100,150,190,0.7)"}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="0.4"
            />
            <rect
              x={CX(5.42, wy) - 1.2}
              y={CY(5.42, wy, 1.54) - 6}
              width="2.4"
              height="6"
              rx="0.6"
              fill={idx % 2 === 0 ? "rgba(100,150,190,0.7)" : "rgba(190,150,80,0.85)"}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="0.4"
            />
          </g>
        ))}
        {/* Smoked glass vitrine door panels with bronze frames */}
        {[2.85, 3.50].map((dy, idx) => (
          <polygon
            key={`k-door-${idx}`}
            points={`${P(5.60, dy, 1.18)} ${P(5.60, dy + 0.65, 1.18)} ${P(5.60, dy + 0.65, 1.74)} ${P(5.60, dy, 1.74)}`}
            fill="rgba(30,26,22,0.45)"
            stroke="rgba(200,162,95,0.6)"
            strokeWidth="0.8"
          />
        ))}
        {/* Undercabinet warm task LED downlight strip onto base counter */}
        <line
          x1={CX(5.58, 2.85)}
          y1={CY(5.58, 2.85, 1.18)}
          x2={CX(5.58, 4.15)}
          y2={CY(5.58, 4.15, 1.18)}
          stroke="rgba(255,210,130,0.8)"
          strokeWidth="1.4"
        />
        <polygon
          points={`${P(5.58, 2.85, 1.18)} ${P(5.58, 4.15, 1.18)} ${P(5.58, 4.15, 0.92)} ${P(5.58, 2.85, 0.92)}`}
          fill="rgba(255,200,120,0.18)"
          filter="url(#soft)"
          style={{ opacity: lights ? 1 : 0.2, transition: "opacity 700ms" }}
        />
      </g>

      {/* 3. Luxury Kitchen Island with Cantilevered Quartzite Slab & Fluted Bronze Base */}
      {/* Floor contact shadow */}
      <Shad x={6.60} y={3.10} w={2.15} d={1.05} />
      {/* Warm LED perimeter underglow pool beneath island */}
      <polygon
        points={`${P(6.75, 3.20, 0.02)} ${P(8.55, 3.20, 0.02)} ${P(8.55, 4.00, 0.02)} ${P(6.75, 4.00, 0.02)}`}
        fill="rgba(255,185,90,0.32)"
        filter="url(#soft)"
        style={{ opacity: lights ? 0.85 : 0.15, transition: "opacity 700ms" }}
      />
      {/* Recessed fluted metallic bronze island plinth base */}
      <Box x={6.85} y={3.22} w={1.55} d={0.72} h={0.84} c={["#3a2e22", "#2c2117", "#1c140c"]} />
      {/* Fluted bronze slats along island front (+y face at y=3.94) */}
      {Array.from({ length: 14 }).map((_, i) => {
        const sx = 6.88 + i * 0.11;
        return (
          <line
            key={`isl-flute-${i}`}
            x1={CX(sx, 3.94)}
            y1={CY(sx, 3.94, 0.06)}
            x2={CX(sx, 3.94)}
            y2={CY(sx, 3.94, 0.84)}
            stroke="#a68344"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Cantilevered Polished Dark Quartzite Slab Countertop (z=0.84..0.98, overhangs to x=6.60..8.65, y=3.05..4.03) */}
      <Box x={6.60} y={3.05} w={2.05} d={0.98} h={0.14} z={0.84} c={["#2c2f38", "#20222a", "#15171d"]} />
      {/* Polished quartzite surface bevel highlights */}
      <line
        x1={CX(6.60, 4.03)}
        y1={CY(6.60, 4.03, 0.98)}
        x2={CX(8.65, 4.03)}
        y2={CY(8.65, 4.03, 0.98)}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.9"
      />
      <line
        x1={CX(8.65, 3.05)}
        y1={CY(8.65, 3.05, 0.98)}
        x2={CX(8.65, 4.03)}
        y2={CY(8.65, 4.03, 0.98)}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.9"
      />
      {/* Undermount warm gold LED channel light under the cantilevered slab */}
      <line
        x1={CX(6.60, 4.03)}
        y1={CY(6.60, 4.03, 0.84)}
        x2={CX(8.65, 4.03)}
        y2={CY(8.65, 4.03, 0.84)}
        stroke="rgba(245,166,35,0.75)"
        strokeWidth="1.3"
      />
      <polygon
        points={`${P(6.60, 4.03, 0.84)} ${P(8.65, 4.03, 0.84)} ${P(8.65, 4.03, 0.65)} ${P(6.60, 4.03, 0.65)}`}
        fill="rgba(245,166,35,0.22)"
        filter="url(#soft)"
        style={{ opacity: lights ? 1 : 0.2, transition: "opacity 700ms" }}
      />
      {/* Island styling: Sculptural bronze fruit vessel and travertine cutting board */}
      <Box x={6.85} y={3.28} w={0.32} d={0.26} h={0.03} z={0.98} c={["#cbbfae", "#b2a593", "#8e8270"]} />{/* travertine board */}
      <circle cx={CX(7.40, 3.45)} cy={CY(7.40, 3.45, 1.02)} r="4.2" fill="#c8a25f" stroke="#876527" strokeWidth="0.6" />{/* bronze bowl */}
      <circle cx={CX(7.38, 3.44)} cy={CY(7.38, 3.44, 1.04)} r="1.6" fill="#facc15" />{/* lemon */}
      <circle cx={CX(7.43, 3.47)} cy={CY(7.43, 3.47, 1.04)} r="1.5" fill="#4ade80" />{/* lime */}

      {/* 4. Three Designer Velvet & Bronze Barstools (y=4.22, centered in the 1.5m doorway with ample clearance) */}
      {[7.05, 7.60, 8.15].map((bx, i) => (
        <g key={`barstool-${i}`}>
          {/* Slender tapered bronze legs */}
          <line x1={CX(bx - 0.11, 4.22)} y1={CY(bx - 0.11, 4.22, 0)} x2={CX(bx - 0.11, 4.22)} y2={CY(bx - 0.11, 4.22, 0.58)} stroke="#9e7c3b" strokeWidth="1" />
          <line x1={CX(bx + 0.11, 4.22)} y1={CY(bx + 0.11, 4.22, 0)} x2={CX(bx + 0.11, 4.22)} y2={CY(bx + 0.11, 4.22, 0.58)} stroke="#9e7c3b" strokeWidth="1" />
          {/* Footrest crossbar */}
          <line x1={CX(bx - 0.11, 4.22)} y1={CY(bx - 0.11, 4.22, 0.22)} x2={CX(bx + 0.11, 4.22)} y2={CY(bx + 0.11, 4.22, 0.22)} stroke="#9e7c3b" strokeWidth="0.9" />
          {/* Plush taupe velvet seat cushion */}
          <Box x={bx - 0.14} y={4.14} w={0.28} d={0.26} h={0.08} z={0.58} c={["#6a6358", "#534d43", "#3d3830"]} />
          {/* Low curved backrest */}
          <Box x={bx - 0.14} y={4.32} w={0.28} d={0.08} h={0.16} z={0.66} c={["#585248", "#443f36", "#322d26"]} />
        </g>
      ))}

      {/* 5. Modern Architectural Cylindrical Pendant Lights above Island */}
      <Pendant x={7.15} y={3.55} on={lights} />
      <Pendant x={7.85} y={3.65} on={lights} />

      {/* ============ SUITE (Option 1: Smoked Glass Vitrine Wardrobe & Fluted Walnut Cantilever Bed) ============ */}
      {/* 1. Bespoke Smoked Glass Vitrine Wardrobe along Back Partition Wall (x=2.95..4.25, y=4.06..4.54) */}
      {/* Note: Ends at x=4.25, leaving a clear 0.68m spatial gap before the spine wall at x=4.93 */}
      <g id="suite-vitrine-wardrobe">
        {/* Floor shadow under wardrobe */}
        <Shad x={2.95} y={4.06} w={1.30} d={0.48} />
        {/* Dark walnut carcass outer frame */}
        <Box x={2.95} y={4.06} w={1.30} d={0.48} h={1.55} c={["#352b20", "#261d15", "#18120c"]} />
        {/* Wardrobe Right Architectural End-Panel (Finished Solid Dark Walnut + Brass Inlay at x=4.25) */}
        <polygon
          points={`${P(4.25, 4.06, 0.0)} ${P(4.25, 4.54, 0.0)} ${P(4.25, 4.54, 1.55)} ${P(4.25, 4.06, 1.55)}`}
          fill="#241b13"
          stroke="#3b2b1e"
          strokeWidth="0.8"
        />
        <line x1={CX(4.25, 4.30)} y1={CY(4.25, 4.30, 0.06)} x2={CX(4.25, 4.30)} y2={CY(4.25, 4.30, 1.50)} stroke="#c8a25f" strokeWidth="0.9" />

        {/* Soft internal cove amber backglow when room lights are ON */}
        <polygon
          points={`${P(2.98, 4.10, 0.12)} ${P(4.22, 4.10, 0.12)} ${P(4.22, 4.10, 1.56)} ${P(2.98, 4.10, 1.56)}`}
          fill="rgba(255,190,100,0.18)"
          filter="url(#soft)"
          style={{ opacity: lights ? 1 : 0.2, transition: "opacity 700ms" }}
        />

        {/* Interior layout: Left Bay (Suits & Drawers, x=2.98..3.58) */}
        {/* Upper luggage / handbag shelf at z=1.24 */}
        <line x1={CX(2.98, 4.25)} y1={CY(2.98, 4.25, 1.24)} x2={CX(3.58, 4.25)} y2={CY(3.58, 4.25, 1.24)} stroke="rgba(245,166,35,0.7)" strokeWidth="1" />
        <Box x={3.08} y={4.14} w={0.34} d={0.28} h={0.16} z={1.25} c={["#5c4028", "#432e1c", "#2d1e11"]} />{/* leather weekend bag */}
        {/* Hanging garment rail at z=1.20 */}
        <line x1={CX(3.00, 4.25)} y1={CY(3.00, 4.25, 1.20)} x2={CX(3.56, 4.25)} y2={CY(3.56, 4.25, 1.20)} stroke="#c8a25f" strokeWidth="1.2" />
        {/* Hanging tailored jackets/shirts */}
        {[3.12, 3.28, 3.44].map((hx, i) => (
          <g key={`suit-${i}`}>
            <line x1={CX(hx, 4.25)} y1={CY(hx, 4.25, 1.20)} x2={CX(hx, 4.25)} y2={CY(hx, 4.25, 1.14)} stroke="#d4af37" strokeWidth="0.8" />
            <polygon
              points={`${P(hx - 0.05, 4.28, 0.72)} ${P(hx + 0.05, 4.28, 0.72)} ${P(hx + 0.05, 4.28, 1.14)} ${P(hx - 0.05, 4.28, 1.14)}`}
              fill={i === 0 ? "#23252e" : i === 1 ? "#4a443d" : "#2f323a"}
            />
          </g>
        ))}
        {/* Lower dark walnut drawer bank (z=0.12..0.62) */}
        <Box x={3.00} y={4.12} w={0.54} d={0.40} h={0.50} z={0.12} c={["#3f3022", "#2e2116", "#1e150d"]} />
        {/* Bronze horizontal drawer handle inlays */}
        <line x1={CX(3.12, 4.52)} y1={CY(3.12, 4.52, 0.28)} x2={CX(3.42, 4.52)} y2={CY(3.42, 4.52, 0.28)} stroke="#c8a25f" strokeWidth="1" />
        <line x1={CX(3.12, 4.52)} y1={CY(3.12, 4.52, 0.48)} x2={CX(3.42, 4.52)} y2={CY(3.42, 4.52, 0.48)} stroke="#c8a25f" strokeWidth="1" />

        {/* Interior layout: Right Bay (Overcoats & Footwear, x=3.62..4.22) */}
        {/* Full-length hanging rail at z=1.46 */}
        <line x1={CX(3.64, 4.25)} y1={CY(3.64, 4.25, 1.46)} x2={CX(4.20, 4.25)} y2={CY(4.20, 4.25, 1.46)} stroke="#c8a25f" strokeWidth="1.2" />
        {/* Long coats / garments */}
        {[3.74, 3.90, 4.06].map((hx, i) => (
          <g key={`coat-${i}`}>
            <line x1={CX(hx, 4.25)} y1={CY(hx, 4.25, 1.46)} x2={CX(hx, 4.25)} y2={CY(hx, 4.25, 1.40)} stroke="#d4af37" strokeWidth="0.8" />
            <polygon
              points={`${P(hx - 0.05, 4.28, 0.52)} ${P(hx + 0.05, 4.28, 0.52)} ${P(hx + 0.05, 4.28, 1.40)} ${P(hx - 0.05, 4.28, 1.40)}`}
              fill={i === 0 ? "#1e2026" : i === 1 ? "#5e4e3f" : "#282a32"}
            />
          </g>
        ))}
        {/* Illuminated bottom shoe shelf at z=0.18 */}
        <line x1={CX(3.64, 4.25)} y1={CY(3.64, 4.25, 0.18)} x2={CX(4.20, 4.25)} y2={CY(4.20, 4.25, 0.18)} stroke="rgba(255,200,120,0.85)" strokeWidth="1" />
        {/* Footwear pairs on shelf */}
        {[3.74, 3.90, 4.06].map((sx, i) => (
          <rect
            key={`shoe-${i}`}
            x={CX(sx, 4.30) - 1.5}
            y={CY(sx, 4.30, 0.18) - 4}
            width="3"
            height="4"
            rx="0.5"
            fill="#121318"
            stroke="rgba(200,162,95,0.4)"
            strokeWidth="0.4"
          />
        ))}

        {/* Vertical internal LED light channel strips along mullions */}
        {[2.98, 3.60, 4.22].map((vx, i) => (
          <line
            key={`vit-led-${i}`}
            x1={CX(vx, 4.54)}
            y1={CY(vx, 4.54, 0.12)}
            x2={CX(vx, 4.54)}
            y2={CY(vx, 4.54, 1.56)}
            stroke="rgba(255,200,120,0.9)"
            strokeWidth="1.2"
          />
        ))}

        {/* Smoked bronze-tinted glass sliding door panels with brushed bronze borders */}
        <polygon
          points={`${P(2.96, 4.54, 0.08)} ${P(3.59, 4.54, 0.08)} ${P(3.59, 4.54, 1.58)} ${P(2.96, 4.54, 1.58)}`}
          fill="rgba(35,28,22,0.42)"
          stroke="#a68344"
          strokeWidth="0.9"
        />
        <polygon
          points={`${P(3.61, 4.54, 0.08)} ${P(4.24, 4.54, 0.08)} ${P(4.24, 4.54, 1.58)} ${P(3.61, 4.54, 1.58)}`}
          fill="rgba(35,28,22,0.42)"
          stroke="#a68344"
          strokeWidth="0.9"
        />
        {/* Diagonal glass reflection sheens */}
        <polygon points={`${P(3.04, 4.54, 1.45)} ${P(3.45, 4.54, 1.45)} ${P(3.04, 4.54, 0.85)}`} fill="rgba(255,255,255,0.06)" />
        <polygon points={`${P(3.69, 4.54, 1.45)} ${P(4.10, 4.54, 1.45)} ${P(3.69, 4.54, 0.85)}`} fill="rgba(255,255,255,0.06)" />
        {/* Full-height sleek bronze finger-pull handles */}
        <line x1={CX(3.55, 4.545)} y1={CY(3.55, 4.545, 0.55)} x2={CX(3.55, 4.545)} y2={CY(3.55, 4.545, 1.15)} stroke="#d4af37" strokeWidth="1.3" />
        <line x1={CX(3.65, 4.545)} y1={CY(3.65, 4.545, 0.55)} x2={CX(3.65, 4.545)} y2={CY(3.65, 4.545, 1.15)} stroke="#d4af37" strokeWidth="1.3" />
      </g>

      {/* 2. Minimalist Floating End-of-Bed Bench (Facing Bedroom Interior, y=5.34..5.64) */}
      <Shad x={1.70} y={5.34} w={1.50} d={0.30} />
      <Box x={1.74} y={5.38} w={1.42} d={0.22} h={0.08} z={0.06} c={["#c8a25f", "#a68344", "#7b5e28"]} />{/* brass frame */}
      <Box x={1.70} y={5.34} w={1.50} d={0.30} h={0.12} z={0.14} c={["#424552", "#333540", "#24252e"]} />{/* plush bouclé cushion */}
      {/* Bench cushion center stitch seams */}
      <line x1={CX(2.20, 5.49)} y1={CY(2.20, 5.49, 0.26)} x2={CX(2.20, 5.64)} y2={CY(2.20, 5.64, 0.26)} stroke="#20222a" strokeWidth="0.8" />
      <line x1={CX(2.70, 5.49)} y1={CY(2.70, 5.49, 0.26)} x2={CX(2.70, 5.64)} y2={CY(2.70, 5.64, 0.26)} stroke="#20222a" strokeWidth="0.8" />

      {/* 3. Floating Cantilevered Master Bed Platform Base */}
      {/* Floor contact shadow underneath floating bed */}
      <Shad x={1.20} y={5.75} w={2.46} d={2.05} />

      {/* Warm LED perimeter under-glow pool cast onto floor */}
      <polygon
        points={`${P(1.25, 5.75, 0.02)} ${P(3.65, 5.75, 0.02)} ${P(3.65, 7.82, 0.02)} ${P(1.25, 7.82, 0.02)}`}
        fill="rgba(255,185,90,0.42)"
        filter="url(#soft)"
        style={{
          opacity: lights ? 0.9 : 0.2,
          transition: "opacity 700ms ease",
        }}
      />

      {/* Recessed dark cantilever plinth base */}
      <Box x={1.48} y={5.95} w={1.94} d={1.65} h={0.14} c={["#1c1d22", "#141518", "#0d0e10"]} />

      {/* Floating Main Walnut Platform Slab (hovering at z = 0.14..0.30, extends y=5.75..7.80) */}
      <Box x={1.25} y={5.75} w={2.40} d={2.05} h={0.16} z={0.14} c={["#6f4d30", "#553a23", "#3d2717"]} />

      {/* Vertical fluted walnut slats along visible foot edge of platform slab (y=5.75) */}
      {Array.from({ length: 18 }).map((_, i) => {
        const fx = 1.32 + i * 0.125;
        return (
          <line
            key={`bed-foot-flute-${i}`}
            x1={CX(fx, 5.75)}
            y1={CY(fx, 5.75, 0.14)}
            x2={CX(fx, 5.75)}
            y2={CY(fx, 5.75, 0.30)}
            stroke="#3f2717"
            strokeWidth="0.8"
          />
        );
      })}
      {/* Vertical fluted walnut slats along visible right side edge (x=3.65) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const fy = 5.85 + i * 0.122;
        return (
          <line
            key={`bed-side-flute-${i}`}
            x1={CX(3.65, fy)}
            y1={CY(3.65, fy, 0.14)}
            x2={CX(3.65, fy)}
            y2={CY(3.65, fy, 0.30)}
            stroke="#3f2717"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Sleek brushed brass trim inlay tracing platform slab edge */}
      <line
        x1={CX(1.25, 7.80)}
        y1={CY(1.25, 7.80, 0.30)}
        x2={CX(3.65, 7.80)}
        y2={CY(3.65, 7.80, 0.30)}
        stroke="rgba(245,166,35,0.55)"
        strokeWidth="1"
      />
      <line
        x1={CX(3.65, 5.75)}
        y1={CY(3.65, 5.75, 0.30)}
        x2={CX(3.65, 7.80)}
        y2={CY(3.65, 7.80, 0.30)}
        stroke="rgba(245,166,35,0.55)"
        strokeWidth="1"
      />

      {/* 4. Hyper-Luxurious Master Bedding: Deep Mattress, Puffy Quilted Duvet, Drapes & Pillows */}
      {/* Deep pillow-top mattress with tailored dark welt edge (z=0.30..0.48) */}
      <Box x={1.30} y={5.80} w={2.30} d={1.95} h={0.18} z={0.30} c={["#2b2d36", "#202128", "#17181e"]} />
      {/* Crisp ivory fitted sheet exposed at the head (y=7.15..7.75) */}
      <polygon
        points={`${P(1.30, 7.15, 0.48)} ${P(3.60, 7.15, 0.48)} ${P(3.60, 7.75, 0.48)} ${P(1.30, 7.75, 0.48)}`}
        fill="#f5f0e8"
      />

      {/* Plush Cloud-Loft Down Duvet with Soft Rounded Drapes (y=5.80..7.15, z=0.48..0.64) */}
      <Box x={1.30} y={5.80} w={2.30} d={1.35} h={0.16} z={0.48} c={["#eee7db", "#d6ccbc", "#b3a593"]} />

      {/* Duvet Soft Draping Side Edge hanging over mattress right side (x=3.60..3.64, z=0.42..0.64) */}
      <polygon
        points={`${P(3.60, 5.80, 0.64)} ${P(3.64, 5.80, 0.42)} ${P(3.64, 7.15, 0.42)} ${P(3.60, 7.15, 0.64)}`}
        fill="#c4baa8"
        stroke="#aaa08e"
        strokeWidth="0.5"
      />
      {/* Realistic organic drape folds along duvet side */}
      {[6.10, 6.45, 6.80].map((dy, i) => (
        <line
          key={`duvet-fold-${i}`}
          x1={CX(3.64, dy)}
          y1={CY(3.64, dy, 0.42)}
          x2={CX(3.60, dy + 0.06)}
          y2={CY(3.60, dy + 0.06, 0.64)}
          stroke="#998e7c"
          strokeWidth="0.7"
        />
      ))}

      {/* Quilted Baffle-Box Stitch Grid & Puffy Cloud Highlights across Duvet */}
      {[6.15, 6.50, 6.85].map((qy, i) => (
        <line
          key={`q-lat-${i}`}
          x1={CX(1.32, qy)}
          y1={CY(1.32, qy, 0.64)}
          x2={CX(3.58, qy)}
          y2={CY(3.58, qy, 0.64)}
          stroke="rgba(175,160,140,0.6)"
          strokeWidth="0.8"
        />
      ))}
      {[1.76, 2.22, 2.68, 3.14].map((qx, i) => (
        <line
          key={`q-lon-${i}`}
          x1={CX(qx, 5.82)}
          y1={CY(qx, 5.82, 0.64)}
          x2={CX(qx, 7.12)}
          y2={CY(qx, 7.12, 0.64)}
          stroke="rgba(175,160,140,0.6)"
          strokeWidth="0.8"
        />
      ))}
      {/* Soft puffy loft highlights in center of quilt pockets */}
      {[
        [1.54, 5.98], [2.00, 5.98], [2.45, 5.98], [2.91, 5.98], [3.37, 5.98],
        [1.54, 6.33], [2.00, 6.33], [2.45, 6.33], [2.91, 6.33], [3.37, 6.33],
        [1.54, 6.68], [2.00, 6.68], [2.45, 6.68], [2.91, 6.68], [3.37, 6.68],
        [1.54, 7.00], [2.00, 7.00], [2.45, 7.00], [2.91, 7.00], [3.37, 7.00],
      ].map(([px, py], i) => (
        <ellipse
          key={`loft-puff-${i}`}
          cx={CX(px, py)}
          cy={CY(px, py, 0.645)}
          rx="5"
          ry="2.4"
          fill="rgba(255,255,255,0.22)"
          filter="url(#soft)"
        />
      ))}

      {/* Elegant Folded Turn-Down Top Cuff (Charcoal Linen Lining with Bronze Piping, y=7.08..7.22) */}
      <Box x={1.30} y={7.08} w={2.30} d={0.14} h={0.07} z={0.62} c={["#30333e", "#242630", "#1a1b22"]} />
      <line
        x1={CX(1.30, 7.08)}
        y1={CY(1.30, 7.08, 0.69)}
        x2={CX(3.60, 7.08)}
        y2={CY(3.60, 7.08, 0.69)}
        stroke="#c8a25f"
        strokeWidth="1.1"
      />

      {/* Rich Cognac Cashmere Throw Runner across Foot of Bed (y=5.82..6.22, z=0.64..0.69) */}
      <Box x={1.26} y={5.82} w={2.38} d={0.40} h={0.05} z={0.64} c={["#b7682f", "#99511f", "#773911"]} />
      {/* Throw blanket side drape cascading down right edge */}
      <polygon
        points={`${P(3.64, 5.82, 0.69)} ${P(3.67, 5.82, 0.40)} ${P(3.67, 6.22, 0.40)} ${P(3.64, 6.22, 0.69)}`}
        fill="#964d1c"
        stroke="#753912"
        strokeWidth="0.6"
      />
      {/* Delicate fringe tassels along throw hem */}
      <line
        x1={CX(3.67, 5.82)}
        y1={CY(3.67, 5.82, 0.40)}
        x2={CX(3.67, 6.22)}
        y2={CY(3.67, 6.22, 0.40)}
        stroke="#f5a623"
        strokeWidth="1.2"
        strokeDasharray="1.4 1.4"
      />
      {/* Soft warm fabric crease highlights across throw */}
      <line x1={CX(1.50, 6.02)} y1={CY(1.50, 6.02, 0.69)} x2={CX(3.50, 6.02)} y2={CY(3.50, 6.02, 0.69)} stroke="rgba(255,200,120,0.4)" strokeWidth="0.8" />

      {/* 5. Soft Layered Pillows (Propped Prominently so they are Clearly Visible) */}
      {/* Row 1: Two King European Square Shams against Headboard (Slate Charcoal Textured Linen, z=0.48..0.70) */}
      <Box x={1.40} y={7.50} w={0.98} d={0.22} h={0.22} z={0.48} c={["#363945", "#2b2d37", "#1e2027"]} />
      <Box x={2.52} y={7.50} w={0.98} d={0.22} h={0.22} z={0.48} c={["#363945", "#2b2d37", "#1e2027"]} />
      {/* Flanged piped border on European shams */}
      <line x1={CX(1.42, 7.72)} y1={CY(1.42, 7.72, 0.70)} x2={CX(2.36, 7.72)} y2={CY(2.36, 7.72, 0.70)} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <line x1={CX(2.54, 7.72)} y1={CY(2.54, 7.72, 0.70)} x2={CX(3.48, 7.72)} y2={CY(3.48, 7.72, 0.70)} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />

      {/* Row 2: Two Plush Down Sleeping Pillows (Crisp Warm White Percale with Center Dents, z=0.48..0.64) */}
      <Box x={1.44} y={7.26} w={0.92} d={0.22} h={0.16} z={0.48} c={["#faf6ef", "#e2dacd", "#bebaa8"]} />
      <Box x={2.54} y={7.26} w={0.92} d={0.22} h={0.16} z={0.48} c={["#faf6ef", "#e2dacd", "#bebaa8"]} />
      {/* Realistic center head-dent shadows on sleeping pillows */}
      <polygon
        points={`${P(1.80, 7.34, 0.64)} ${P(2.02, 7.34, 0.64)} ${P(2.00, 7.42, 0.63)} ${P(1.82, 7.42, 0.63)}`}
        fill="#cfc7b8"
      />
      <polygon
        points={`${P(2.90, 7.34, 0.64)} ${P(3.12, 7.34, 0.64)} ${P(3.10, 7.42, 0.63)} ${P(2.92, 7.42, 0.63)}`}
        fill="#cfc7b8"
      />
      {/* Pillow top highlight curve */}
      <line x1={CX(1.50, 7.35)} y1={CY(1.50, 7.35, 0.64)} x2={CX(2.30, 7.35)} y2={CY(2.30, 7.35, 0.64)} stroke="rgba(255,255,255,0.6)" strokeWidth="0.9" />
      <line x1={CX(2.60, 7.35)} y1={CY(2.60, 7.35, 0.64)} x2={CX(3.40, 7.35)} y2={CY(3.40, 7.35, 0.64)} stroke="rgba(255,255,255,0.6)" strokeWidth="0.9" />

      {/* Row 3: Designer Cognac Velvet Lumbar / Bolster Cushion (Center, z=0.48..0.62) */}
      <Box x={2.20} y={7.22} w={0.50} d={0.18} h={0.14} z={0.48} c={["#c6773a", "#a85d26", "#874416"]} />
      <circle cx={CX(2.45, 7.31)} cy={CY(2.45, 7.31, 0.62)} r="1.6" fill="#facc15" stroke="#78350f" strokeWidth="0.5" />{/* gold center button */}

      {/* 6. Low-Profile Fluted Walnut Headboard at Front Glass Wall (y=7.80..7.92, z=0.10..0.56) */}
      {/* Maintains headboard position at front glass without obstructing pillows or bedding */}
      <g id="bed-headboard-wall">
        {/* Dark acoustic backing panel */}
        <polygon
          points={`${P(0.85, 7.88, 0.10)} ${P(4.05, 7.88, 0.10)} ${P(4.05, 7.88, 0.56)} ${P(0.85, 7.88, 0.56)}`}
          fill="#171514"
          stroke="#272422"
          strokeWidth="0.8"
        />
        {/* Headboard main walnut box structure */}
        <Box x={0.85} y={7.80} w={3.20} d={0.10} h={0.46} z={0.10} c={["#6f4d30", "#553a23", "#3d2717"]} />
        {/* Vertical fluted walnut slats along visible front face of headboard */}
        {Array.from({ length: 28 }).map((_, i) => {
          const sx = 0.88 + i * 0.112;
          const slatTone = i % 3 === 0 ? "#745133" : i % 3 === 1 ? "#66472c" : "#5a3d24";
          return (
            <g key={`headboard-slat-${i}`}>
              <line
                x1={CX(sx - 0.012, 7.90)}
                y1={CY(sx - 0.012, 7.90, 0.10)}
                x2={CX(sx - 0.012, 7.90)}
                y2={CY(sx - 0.012, 7.90, 0.56)}
                stroke="#0d0c0a"
                strokeWidth="1.0"
              />
              <polygon
                points={`${P(sx, 7.90, 0.10)} ${P(sx + 0.05, 7.90, 0.10)} ${P(sx + 0.05, 7.90, 0.56)} ${P(sx, 7.90, 0.56)}`}
                fill={slatTone}
              />
              <polygon
                points={`${P(sx, 7.90, 0.56)} ${P(sx + 0.05, 7.90, 0.56)} ${P(sx + 0.05, 7.84, 0.56)} ${P(sx, 7.84, 0.56)}`}
                fill="#8b623e"
              />
            </g>
          );
        })}
        {/* Warm integrated LED headboard top halo strip uplighting sheer curtains */}
        <line
          x1={CX(0.85, 7.85)}
          y1={CY(0.85, 7.85, 0.56)}
          x2={CX(4.05, 7.85)}
          y2={CY(4.05, 7.85, 0.56)}
          stroke="rgba(255,200,120,0.75)"
          strokeWidth="1.3"
        />
        <polygon
          points={`${P(0.85, 7.85, 0.56)} ${P(4.05, 7.85, 0.56)} ${P(4.05, 7.85, 0.68)} ${P(0.85, 7.85, 0.68)}`}
          fill="rgba(255,200,120,0.20)"
          filter="url(#soft)"
          style={{ opacity: lights ? 1 : 0.25, transition: "opacity 700ms ease" }}
        />
      </g>

      {/* 7. Floating Fluted Walnut Nightstands (Flanking headboard on Left and Right) */}
      {/* Left Floating Nightstand (x=0.82..1.24) */}
      <Box x={0.82} y={7.46} w={0.42} d={0.34} h={0.16} z={0.26} c={["#624328", "#4c331d", "#352212"]} />
      <Box x={0.80} y={7.44} w={0.46} d={0.36} h={0.025} z={0.42} c={["#353740", "#272830", "#1a1b22"]} />{/* stone top */}
      {/* Left Nightstand fluted drawer lines */}
      <line x1={CX(0.96, 7.80)} y1={CY(0.96, 7.80, 0.26)} x2={CX(0.96, 7.80)} y2={CY(0.96, 7.80, 0.42)} stroke="#2a1b0e" strokeWidth="0.8" />
      <line x1={CX(1.10, 7.80)} y1={CY(1.10, 7.80, 0.26)} x2={CX(1.10, 7.80)} y2={CY(1.10, 7.80, 0.42)} stroke="#2a1b0e" strokeWidth="0.8" />
      {/* Designer bedside water carafe & tumbler */}
      <rect x={CX(0.92, 7.58) - 1.2} y={CY(0.92, 7.58, 0.445) - 5} width="2.4" height="5" rx="0.6" fill="rgba(200,225,245,0.7)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
      {/* Frosted glass globe reading lamp with brass base */}
      <ellipse cx={CX(1.06, 7.63)} cy={CY(1.06, 7.63, 0.445)} rx="2.5" ry="1.2" fill="#c8a25f" />
      <circle cx={CX(1.06, 7.63)} cy={CY(1.06, 7.63, 0.52)} r="5.5" fill="#ffdf99" filter="url(#soft)" opacity={lights ? 0.95 : 0.25} />
      <circle cx={CX(1.06, 7.63)} cy={CY(1.06, 7.63, 0.52)} r="2.4" fill="#fff5d6" />

      {/* Right Floating Nightstand (x=3.68..4.10) */}
      <Box x={3.68} y={7.46} w={0.42} d={0.34} h={0.16} z={0.26} c={["#624328", "#4c331d", "#352212"]} />
      <Box x={3.66} y={7.44} w={0.46} d={0.36} h={0.025} z={0.42} c={["#353740", "#272830", "#1a1b22"]} />{/* stone top */}
      {/* Right Nightstand fluted drawer lines */}
      <line x1={CX(3.82, 7.80)} y1={CY(3.82, 7.80, 0.26)} x2={CX(3.82, 7.80)} y2={CY(3.82, 7.80, 0.42)} stroke="#2a1b0e" strokeWidth="0.8" />
      <line x1={CX(3.96, 7.80)} y1={CY(3.96, 7.80, 0.26)} x2={CX(3.96, 7.80)} y2={CY(3.96, 7.80, 0.42)} stroke="#2a1b0e" strokeWidth="0.8" />
      {/* Designer hardcover book with bookmark */}
      <polygon points={`${P(3.74, 7.52, 0.445)} ${P(3.88, 7.52, 0.445)} ${P(3.88, 7.64, 0.445)} ${P(3.74, 7.64, 0.445)}`} fill="#3f3d56" stroke="#c8a25f" strokeWidth="0.5" />
      {/* Frosted glass globe reading lamp with brass base */}
      <ellipse cx={CX(3.94, 7.63)} cy={CY(3.94, 7.63, 0.445)} rx="2.5" ry="1.2" fill="#c8a25f" />
      <circle cx={CX(3.94, 7.63)} cy={CY(3.94, 7.63, 0.52)} r="5.5" fill="#ffdf99" filter="url(#soft)" opacity={lights ? 0.95 : 0.25} />
      <circle cx={CX(3.94, 7.63)} cy={CY(3.94, 7.63, 0.52)} r="2.4" fill="#fff5d6" />

      {/* ============ SUITE PANORAMIC WINDOW & RIPPLE-FOLD CURTAINS (Option 1) ============ */}
      {/* 1. Recessed Floor-to-Ceiling Panoramic Window Aperture on Left Wall (x=0) */}
      <polygon
        points={`${P(0.12, 4.90, 0.08)} ${P(0.12, 7.30, 0.08)} ${P(0.12, 7.30, 1.62)} ${P(0.12, 4.90, 1.62)}`}
        fill={curtains ? "url(#windowView)" : "#13141a"}
        style={{ transition: "fill 950ms ease" }}
      />
      {/* Architectural window mullions / dark graphite glazing frame */}
      <polygon
        points={`${P(0.12, 4.90, 0.08)} ${P(0.12, 7.30, 0.08)} ${P(0.12, 7.30, 1.62)} ${P(0.12, 4.90, 1.62)}`}
        fill="none"
        stroke="#1a1c22"
        strokeWidth="1.8"
      />
      {/* Vertical window glazing dividers */}
      <line x1={CX(0.12, 5.70)} y1={CY(0.12, 5.70, 0.08)} x2={CX(0.12, 5.70)} y2={CY(0.12, 5.70, 1.62)} stroke="#1e2027" strokeWidth="1.4" />
      <line x1={CX(0.12, 6.50)} y1={CY(0.12, 6.50, 0.08)} x2={CX(0.12, 6.50)} y2={CY(0.12, 6.50, 1.62)} stroke="#1e2027" strokeWidth="1.4" />
      {/* Horizontal transom bar */}
      <line x1={CX(0.12, 4.90)} y1={CY(0.12, 4.90, 1.25)} x2={CX(0.12, 7.30)} y2={CY(0.12, 7.30, 1.25)} stroke="#1e2027" strokeWidth="1.2" />

      {/* 2. Inner Layer: Translucent Linen Sheer Drapes */}
      <polygon
        points={`${P(0.126, 4.92, 0.08)} ${P(0.126, 7.28, 0.08)} ${P(0.126, 7.28, 1.61)} ${P(0.126, 4.92, 1.61)}`}
        fill={curtains ? "rgba(240,235,225,0.18)" : "rgba(240,235,225,0.06)"}
        style={{ transition: "fill 950ms ease" }}
      />
      {/* Soft vertical sheer gathers */}
      {[5.15, 5.42, 5.70, 5.98, 6.22, 6.50, 6.78, 7.05].map((sy, idx) => (
        <line
          key={`sheer-${idx}`}
          x1={CX(0.126, sy)}
          y1={CY(0.126, sy, 0.08)}
          x2={CX(0.126, sy)}
          y2={CY(0.126, sy, 1.61)}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.8"
        />
      ))}

      {/* 3. Concealed Ceiling Pelmet Box with Warm LED Cove Light */}
      <Box x={0.06} y={4.88} w={0.08} d={2.44} h={0.07} z={1.61} c={["#2b2c34", "#1f2026", "#16171b"]} />
      {/* Warm LED cove strip */}
      <line
        x1={CX(0.14, 4.90)}
        y1={CY(0.14, 4.90, 1.61)}
        x2={CX(0.14, 7.30)}
        y2={CY(0.14, 7.30, 1.61)}
        stroke="rgba(255,200,120,0.65)"
        strokeWidth="1.2"
      />
      {/* Subtle down-wash cove glow */}
      <polygon
        points={`${P(0.13, 4.90, 1.61)} ${P(0.13, 7.30, 1.61)} ${P(0.13, 7.30, 1.48)} ${P(0.13, 4.90, 1.48)}`}
        fill="rgba(255,200,120,0.15)"
        filter="url(#soft)"
      />

      {/* 4. TRUE MOTORIZED ACCORDION FOLDING BLACKOUT DRAPES */}
      {(() => {
        // Left panel: anchored at y=4.92, leading edge compresses from 6.08 down to 5.24 when folded
        const leftEnd = lerp(6.08, 5.24, curtV);
        const leftSpan = leftEnd - 4.92;
        // Right panel: anchored at y=7.28, leading edge compresses from 6.12 down to 6.96 when folded
        const rightStart = lerp(6.12, 6.96, curtV);
        const rightSpan = 7.28 - rightStart;

        // As fabric folds and gathers, pleat depth amplitude increases naturally
        const xCrest = lerp(0.140, 0.150, curtV);
        const xTrough = lerp(0.134, 0.128, curtV);
        const numFolds = 6;

        return (
          <g id="accordion-curtains">
            {/* ---------- LEFT DRAPE PANEL (Folds towards left jamb y=4.92) ---------- */}
            <g id="left-curtain-accordion">
              {/* Backing drape fabric */}
              <polygon
                points={`${P(0.134, 4.92, 0.08)} ${P(0.134, leftEnd, 0.08)} ${P(0.134, leftEnd, 1.61)} ${P(0.134, 4.92, 1.61)}`}
                fill="#252730"
              />
              {/* Accordion pleat waves */}
              {Array.from({ length: numFolds }).map((_, i) => {
                const y0 = 4.92 + (i / numFolds) * leftSpan;
                const yMid = 4.92 + ((i + 0.5) / numFolds) * leftSpan;
                const y1 = 4.92 + ((i + 1) / numFolds) * leftSpan;
                return (
                  <g key={`left-accordion-${i}`}>
                    {/* Crest highlight face */}
                    <polygon
                      points={`${P(xCrest, y0, 0.08)} ${P(xCrest, yMid, 0.08)} ${P(xCrest, yMid, 1.61)} ${P(xCrest, y0, 1.61)}`}
                      fill={i % 2 === 0 ? "#383b48" : "#2f313c"}
                    />
                    {/* Trough shadow face */}
                    <polygon
                      points={`${P(xTrough, yMid, 0.08)} ${P(xTrough, y1, 0.08)} ${P(xTrough, y1, 1.61)} ${P(xTrough, yMid, 1.61)}`}
                      fill="#1a1b22"
                    />
                    {/* Accordion crease shadow line */}
                    <line
                      x1={CX(xCrest, yMid)}
                      y1={CY(xCrest, yMid, 0.08)}
                      x2={CX(xCrest, yMid)}
                      y2={CY(xCrest, yMid, 1.61)}
                      stroke="#111216"
                      strokeWidth="1.1"
                    />
                    {/* Track glider eyelet ring at top */}
                    <circle
                      cx={CX(xCrest, yMid)}
                      cy={CY(xCrest, yMid, 1.61)}
                      r="1.2"
                      fill="#c8a25f"
                    />
                  </g>
                );
              })}
              {/* Bottom tailored hemline with gold edge stitch */}
              <line
                x1={CX(xCrest, 4.92)}
                y1={CY(xCrest, 4.92, 0.08)}
                x2={CX(xCrest, leftEnd)}
                y2={CY(xCrest, leftEnd, 0.08)}
                stroke="rgba(245,166,35,0.35)"
                strokeWidth="0.8"
              />
              {/* Leading edge vertical trim */}
              <line
                x1={CX(xCrest, leftEnd)}
                y1={CY(xCrest, leftEnd, 0.08)}
                x2={CX(xCrest, leftEnd)}
                y2={CY(xCrest, leftEnd, 1.61)}
                stroke="rgba(245,166,35,0.45)"
                strokeWidth="1"
              />
            </g>

            {/* ---------- RIGHT DRAPE PANEL (Folds towards right jamb y=7.28) ---------- */}
            <g id="right-curtain-accordion">
              {/* Backing drape fabric */}
              <polygon
                points={`${P(0.134, rightStart, 0.08)} ${P(0.134, 7.28, 0.08)} ${P(0.134, 7.28, 1.61)} ${P(0.134, rightStart, 1.61)}`}
                fill="#252730"
              />
              {/* Accordion pleat waves */}
              {Array.from({ length: numFolds }).map((_, i) => {
                const y0 = rightStart + (i / numFolds) * rightSpan;
                const yMid = rightStart + ((i + 0.5) / numFolds) * rightSpan;
                const y1 = rightStart + ((i + 1) / numFolds) * rightSpan;
                return (
                  <g key={`right-accordion-${i}`}>
                    {/* Crest highlight face */}
                    <polygon
                      points={`${P(xCrest, y0, 0.08)} ${P(xCrest, yMid, 0.08)} ${P(xCrest, yMid, 1.61)} ${P(xCrest, y0, 1.61)}`}
                      fill={i % 2 === 0 ? "#383b48" : "#2f313c"}
                    />
                    {/* Trough shadow face */}
                    <polygon
                      points={`${P(xTrough, yMid, 0.08)} ${P(xTrough, y1, 0.08)} ${P(xTrough, y1, 1.61)} ${P(xTrough, yMid, 1.61)}`}
                      fill="#1a1b22"
                    />
                    {/* Accordion crease shadow line */}
                    <line
                      x1={CX(xCrest, yMid)}
                      y1={CY(xCrest, yMid, 0.08)}
                      x2={CX(xCrest, yMid)}
                      y2={CY(xCrest, yMid, 1.61)}
                      stroke="#111216"
                      strokeWidth="1.1"
                    />
                    {/* Track glider eyelet ring at top */}
                    <circle
                      cx={CX(xCrest, yMid)}
                      cy={CY(xCrest, yMid, 1.61)}
                      r="1.2"
                      fill="#c8a25f"
                    />
                  </g>
                );
              })}
              {/* Bottom tailored hemline with gold edge stitch */}
              <line
                x1={CX(xCrest, rightStart)}
                y1={CY(xCrest, rightStart, 0.08)}
                x2={CX(xCrest, 7.28)}
                y2={CY(xCrest, 7.28, 0.08)}
                stroke="rgba(245,166,35,0.35)"
                strokeWidth="0.8"
              />
              {/* Leading edge vertical trim */}
              <line
                x1={CX(xCrest, rightStart)}
                y1={CY(xCrest, rightStart, 0.08)}
                x2={CX(xCrest, rightStart)}
                y2={CY(xCrest, rightStart, 1.61)}
                stroke="rgba(245,166,35,0.45)"
                strokeWidth="1"
              />
            </g>
          </g>
        );
      })()}
      <Pendant x={2.4} y={6.6} on={lights} />

      {/* ============ ENTRY ============ */}
      <Box x={5.4} y={5.6} w={1.4} d={0.4} h={0.55} c={WARMW} />{/* console */}
      <Pendant x={7.4} y={6.5} on={lights} />

      {/* ---------- GLASS FRONT WALLS (x=10 and y=8) — see-through, so all 4 sides are walled ---------- */}
      {/* x=10 right-front glass */}
      <polygon points={`${P(9.94, 0, 0)} ${P(9.94, 8, 0)} ${P(9.94, 8, 1.7)} ${P(9.94, 0, 1.7)}`} fill="rgba(150,188,216,0.08)" stroke="rgba(185,208,228,0.28)" strokeWidth="1" />
      {[2, 4, 6].map((my, i) => (<line key={i} x1={CX(9.94, my)} y1={CY(9.94, my, 0)} x2={CX(9.94, my)} y2={CY(9.94, my, 1.7)} stroke="rgba(185,208,228,0.2)" strokeWidth="1" />))}
      {/* y=8 front glass — left of gate (x0..5.7) */}
      <polygon points={`${P(0, 7.94, 0)} ${P(5.7, 7.94, 0)} ${P(5.7, 7.94, 1.7)} ${P(0, 7.94, 1.7)}`} fill="rgba(150,188,216,0.08)" stroke="rgba(185,208,228,0.28)" strokeWidth="1" />
      {[1.5, 3, 4.5].map((mx, i) => (<line key={i} x1={CX(mx, 7.94)} y1={CY(mx, 7.94, 0)} x2={CX(mx, 7.94)} y2={CY(mx, 7.94, 1.7)} stroke="rgba(185,208,228,0.2)" strokeWidth="1" />))}
      {/* y=8 front glass — right of gate (x9.1..10) */}
      <polygon points={`${P(9.1, 7.94, 0)} ${P(9.94, 7.94, 0)} ${P(9.94, 7.94, 1.7)} ${P(9.1, 7.94, 1.7)}`} fill="rgba(150,188,216,0.08)" stroke="rgba(185,208,228,0.28)" strokeWidth="1" />

      {/* ---------- FRONT SLIDING GATE (the entrance, y=8 edge) ---------- */}
      <Box x={5.66} y={7.86} w={0.16} d={0.2} h={1.35} c={METAL} />{/* left post */}
      <Box x={9.02} y={7.86} w={0.16} d={0.2} h={1.35} c={METAL} />{/* right post */}
      {/* LEFT leaf — hinged at left post, swings inward */}
      <g onClick={onToggleGate} style={{ cursor: onToggleGate ? "pointer" : "default" }}>
        <polygon points={`${P(5.85, 8, 0)} ${P(lfx, lfy, 0)} ${P(lfx, lfy, H)} ${P(5.85, 8, H)}`} fill="rgba(32,34,40,0.5)" stroke={METAL[0]} strokeWidth="1" />
        <line x1={CX(5.85, 8)} y1={CY(5.85, 8, H)} x2={CX(lfx, lfy)} y2={CY(lfx, lfy, H)} stroke={METAL[0]} strokeWidth="1.4" />
        <line x1={CX(5.85, 8)} y1={CY(5.85, 8, 0.56)} x2={CX(lfx, lfy)} y2={CY(lfx, lfy, 0.56)} stroke={METAL[0]} strokeWidth="1" />
        {[0.22, 0.44, 0.66, 0.88].map((f, i) => { const bx = lerp(5.85, lfx, f), by = lerp(8, lfy, f); return <line key={i} x1={CX(bx, by)} y1={CY(bx, by, 0.05)} x2={CX(bx, by)} y2={CY(bx, by, H)} stroke={METAL[1]} strokeWidth="1.5" />; })}
      </g>
      {/* RIGHT leaf — hinged at right post, swings inward */}
      <g onClick={onToggleGate} style={{ cursor: onToggleGate ? "pointer" : "default" }}>
        <polygon points={`${P(8.95, 8, 0)} ${P(rfx, rfy, 0)} ${P(rfx, rfy, H)} ${P(8.95, 8, H)}`} fill="rgba(32,34,40,0.5)" stroke={METAL[0]} strokeWidth="1" />
        <line x1={CX(8.95, 8)} y1={CY(8.95, 8, H)} x2={CX(rfx, rfy)} y2={CY(rfx, rfy, H)} stroke={METAL[0]} strokeWidth="1.4" />
        <line x1={CX(8.95, 8)} y1={CY(8.95, 8, 0.56)} x2={CX(rfx, rfy)} y2={CY(rfx, rfy, 0.56)} stroke={METAL[0]} strokeWidth="1" />
        {[0.22, 0.44, 0.66, 0.88].map((f, i) => { const bx = lerp(8.95, rfx, f), by = lerp(8, rfy, f); return <line key={i} x1={CX(bx, by)} y1={CY(bx, by, 0.05)} x2={CX(bx, by)} y2={CY(bx, by, H)} stroke={METAL[1]} strokeWidth="1.5" />; })}
      </g>
      {/* security camera on the right gate post */}
      <g transform={`translate(${CX(9.1, 7.9)} ${CY(9.1, 7.9, 1.42)})`}>
        <circle r="7" fill={security ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.06)"} stroke={security ? "#f87171" : "rgba(255,255,255,0.25)"} strokeWidth="1" />
        <g style={{ color: security ? "#f87171" : "#8a8a92" }} transform="translate(-6 -6) scale(0.5)">
          <svg viewBox="0 0 24 24" width="24" height="24" {...stroke}><path d="M3 7h13l4 3v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /><circle cx="10" cy="13" r="3" /></svg>
        </g>
        {security && <circle className="duro-rec" cx="8" cy="-7" r="2.4" fill="#ef4444" />}
      </g>

      {/* ---------- CAR — drives in through the open gate / parks / exits ---------- */}
      {(cv > 0.01 || carTarget > 0.01 || carParked || carMoving !== null) && (() => {
        const cy = lerp(10.3, 6.9, cv);
        const ccx = CX(7.4, cy), ccy = CY(7.4, cy, 0.15);
        const isExiting = carMoving === "exiting";
        const isEntering = carMoving === "entering";

        return (
          <g onClick={onToggleGate} style={{ cursor: onToggleGate ? "pointer" : "default" }} transform={`translate(${ccx} ${ccy}) scale(1.3) translate(${-ccx} ${-ccy})`}>
            <Shad x={7.04} y={cy - 0.68} w={0.72} d={1.36} />
            {/* wheels */}
            <Box x={6.99} y={cy - 0.5} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            <Box x={6.99} y={cy + 0.18} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            <Box x={7.69} y={cy - 0.5} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            <Box x={7.69} y={cy + 0.18} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            {/* body + luxury tinted cabin */}
            <Box x={7.04} y={cy - 0.68} w={0.72} d={1.36} h={0.3} z={0.06} c={["#48505e", "#373d48", "#282d35"]} />
            <Box x={7.14} y={cy - 0.16} w={0.52} d={0.66} h={0.26} z={0.36} c={["#9db8cf", "#7890a6", "#5b7082"]} />
            {/* Headlight beam (front = -y, shines when entering or when gate open while parked) */}
            {(isEntering || (carParked && (gate || isExiting))) && (
              <ellipse cx={CX(7.4, cy - 1.5)} cy={CY(7.4, cy - 1.5, 0.15)} rx="32" ry="16" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: 0.6 }} />
            )}
            {/* Red reverse ground pool behind car when reversing out */}
            {isExiting && (
              <ellipse cx={CX(7.4, cy + 1.3)} cy={CY(7.4, cy + 1.3, 0.08)} rx="28" ry="14" fill="rgba(239,68,68,0.4)" style={{ mixBlendMode: "screen" }} />
            )}
            {/* Headlights */}
            <ellipse cx={CX(7.19, cy - 0.68)} cy={CY(7.19, cy - 0.68, 0.22)} rx="2.4" ry="1.6" fill={isExiting ? "#fde047" : "#fff4d2"} />
            <ellipse cx={CX(7.61, cy - 0.68)} cy={CY(7.61, cy - 0.68, 0.22)} rx="2.4" ry="1.6" fill={isExiting ? "#fde047" : "#fff4d2"} />
            {/* Tail lights (red glows brighter when reversing) */}
            <ellipse cx={CX(7.19, cy + 0.68)} cy={CY(7.19, cy + 0.68, 0.24)} rx={isExiting ? "3.2" : "2"} ry={isExiting ? "2.0" : "1.3"} fill={isExiting ? "#ef4444" : "#ff5555"} />
            <ellipse cx={CX(7.61, cy + 0.68)} cy={CY(7.61, cy + 0.68, 0.24)} rx={isExiting ? "3.2" : "2"} ry={isExiting ? "2.0" : "1.3"} fill={isExiting ? "#ef4444" : "#ff5555"} />
          </g>
        );
      })()}


      {/* ---------- MUSIC — colourful amplitude bars (real waveform) on all four sides ---------- */}
      {music && <g style={{ pointerEvents: "none" }}>{musicBars}</g>}

      {/* ---------- SECURITY OVERLAY + NIGHT TINT ---------- */}
      {security && (
        <polygon points={`${P(0, 0)} ${P(10, 0)} ${P(10, 8)} ${P(0, 8)}`} fill="rgba(220,40,40,0.06)" style={{ pointerEvents: "none" }} />
      )}
      <polygon points={`${P(0, 0)} ${P(10, 0)} ${P(10, 8)} ${P(0, 8)}`} fill="rgba(88,124,180,0.18)" style={{ mixBlendMode: "multiply", opacity: lights ? 0 : 0.55, transition: "opacity 900ms ease", pointerEvents: "none" }} />
      <circle cx={CX(5, 4)} cy={CY(5, 4)} r={210} fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 0 : 0.12, transition: "opacity 900ms ease", pointerEvents: "none" }} />
    </svg>
  );
}

/* ---------- phone control card ---------- */
function StatCard({ icon, label, value, active, activeColor = "gold", onClick }: { icon: React.ReactNode; label: string; value: string; active: boolean; activeColor?: "gold" | "red"; onClick: () => void }) {
  const on = activeColor === "red"
    ? "border-red-400/50 bg-red-500/10 shadow-[0_0_0_1px_rgba(248,113,113,0.35),0_0_20px_-6px_rgba(248,113,113,0.6)]"
    : "border-gold/60 bg-gold/[0.12] shadow-[0_0_0_1px_rgba(245,166,35,0.4),0_0_22px_-6px_rgba(245,166,35,0.6)]";
  const chip = activeColor === "red" ? "bg-red-400 text-black" : "bg-gold text-black";
  const valColor = active ? (activeColor === "red" ? "text-red-300" : "text-gold") : "text-stone-200";
  return (
    <button type="button" onClick={onClick} className={`group relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition-all duration-300 active:scale-[0.97] ${active ? on : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg p-1.5 transition-colors duration-300 ${active ? chip : "bg-white/[0.06] text-stone-300"}`}>{icon}</span>
      <span className="text-[9px] uppercase tracking-[0.14em] text-stone-400">{label}</span>
      <span className={`-mt-1 text-[13px] font-semibold transition-colors ${valColor}`}>{value}</span>
    </button>
  );
}

export default function SmartHomeController() {
  const [lights, setLights] = useState(true);
  const [fan, setFan] = useState(false);
  const [fanSpeed, setFanSpeed] = useState<FanSpeed>("medium");
  const [curtains, setCurtains] = useState(false);
  const [gate, setGate] = useState(false);
  const [carParked, setCarParked] = useState(false);
  const [carMoving, setCarMoving] = useState<"entering" | "exiting" | null>(null);
  const [carTarget, setCarTarget] = useState(0);
  const [gateStatusText, setGateStatusText] = useState<string | null>(null);
  const [music, setMusic] = useState(false);
  const [security, setSecurity] = useState(false);
  const [tv, setTv] = useState(false);
  const [temp, setTemp] = useState(23);
  const [scene, setScene] = useState<Scene>(null);

  const gateTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  const clearGateTimeouts = () => {
    gateTimeoutRef.current.forEach((t) => clearTimeout(t));
    gateTimeoutRef.current = [];
  };

  useEffect(() => {
    return () => clearGateTimeouts();
  }, []);

  const handleGateToggle = () => {
    clearGateTimeouts();
    setScene(null);

    if (!carParked) {
      // ===== SEQUENCE 1: CAR ENTERS, THEN GATE CLOSES =====
      // 1. Open the gate
      setGate(true);
      setCarMoving("entering");
      setGateStatusText("Opening...");

      // 2. Once gate is open (500ms), car drives in
      const t1 = setTimeout(() => {
        setCarTarget(1);
        setGateStatusText("Entering...");
      }, 500);

      // 3. Car reaches inside position (~2200ms)
      const t2 = setTimeout(() => {
        setCarParked(true);
        setCarMoving(null);
        setGateStatusText("Parked");
      }, 2200);

      // 4. After pause, gate automatically closes (2800ms)
      const t3 = setTimeout(() => {
        setGate(false);
        setGateStatusText("Closing...");
      }, 2800);

      // 5. Gate fully closed (3500ms)
      const t4 = setTimeout(() => {
        setGateStatusText(null);
      }, 3500);

      gateTimeoutRef.current = [t1, t2, t3, t4];
    } else {
      // ===== SEQUENCE 2: GATE OPENS, CAR EXITS, THEN GATE CLOSES =====
      // 1. Open the gate
      setGate(true);
      setCarMoving("exiting");
      setGateStatusText("Opening...");

      // 2. Once gate is open (500ms), car drives out
      const t1 = setTimeout(() => {
        setCarTarget(0);
        setGateStatusText("Exiting...");
      }, 500);

      // 3. Car reaches outside position (~2200ms)
      const t2 = setTimeout(() => {
        setCarParked(false);
        setCarMoving(null);
        setGateStatusText("Departed");
      }, 2200);

      // 4. After pause, gate automatically closes (2800ms)
      const t3 = setTimeout(() => {
        setGate(false);
        setGateStatusText("Closing...");
      }, 2800);

      // 5. Gate fully closed (3500ms)
      const t4 = setTimeout(() => {
        setGateStatusText(null);
      }, 3500);

      gateTimeoutRef.current = [t1, t2, t3, t4];
    }
  };

  const tog = (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => { setter((v) => !v); setScene(null); };
  const toggleFan = () => { setFan((f) => !f); setScene(null); };
  const bump = (d: number) => () => { setTemp((t) => Math.max(16, Math.min(30, t + d))); setScene(null); };
  const applyScene = (s: Exclude<Scene, null>) => () => {
    setScene(s);
    clearGateTimeouts();
    if (s === "morning") { setLights(true); setCurtains(true); setFan(false); setMusic(true); setSecurity(false); setGate(false); setTv(false); setTemp(22); }
    if (s === "evening") { setLights(true); setCurtains(false); setFan(true); setFanSpeed("medium"); setMusic(true); setSecurity(false); setGate(false); setTv(true); setTemp(24); }
    if (s === "arm") { setLights(false); setCurtains(false); setFan(false); setMusic(false); setSecurity(true); setGate(false); setTv(false); setTemp(23); }
    if (s === "away") { setLights(false); setCurtains(false); setFan(false); setMusic(false); setSecurity(true); setGate(false); setTv(false); setTemp(20); }
  };

  const sceneLabel =
    scene === "morning" ? "Good Morning scene"
    : scene === "evening" ? "Good Evening scene"
    : scene === "arm" ? "Armed — perimeter secure"
    : scene === "away" ? "Home Away scene"
    : "Custom control";

  return (
    <section className="bg-black px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-white/[0.06]">
      <div className="max-w-6xl w-full mx-auto">
        <motion.p initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-gold mb-5">
          Live Control · Try It
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="font-display text-4xl md:text-6xl font-medium text-white leading-[1.05]">
          Tap once. The whole home responds.
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mt-6 max-w-2xl text-base md:text-lg font-light text-stone-300/90 leading-relaxed">
          A working preview of the DURO app beside a live digital twin of the residence.
          Switch the lights, spin the fan, slide the gate, arm the cameras or set a scene —
          and watch the home react in real time.
        </motion.p>

        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">
          {/* ---------------- LEFT · isometric digital twin ---------------- */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="lg:col-span-8 lg:flex">
            <div className="relative aspect-[8/5] lg:aspect-auto lg:h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0d0d10] to-[#050506] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {/* subtle vignette */}
              <div className="pointer-events-none absolute inset-0 z-20" style={{ background: "radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
              {/* HUD corners */}
              <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l border-t border-gold/40 z-30" />
              <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r border-t border-gold/40 z-30" />
              <div className="pointer-events-none absolute left-3 bottom-3 h-5 w-5 border-l border-b border-gold/40 z-30" />
              <div className="pointer-events-none absolute right-3 bottom-3 h-5 w-5 border-r border-b border-gold/40 z-30" />

              {/* label */}
              <div className="absolute left-5 top-4 z-30 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="duro-node absolute inline-flex h-full w-full rounded-full bg-gold" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-300">Digital Twin · Live</span>
              </div>

              {/* temperature chip */}
              <div className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur">
                <span className="h-3.5 w-3.5 text-gold"><ThermoI /></span>
                <span className="text-[11px] font-semibold text-stone-100">{temp}°C</span>
              </div>

              {/* the scene */}
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <IsoHome
                  lights={lights}
                  fan={fan}
                  fanSpeed={fanSpeed}
                  curtains={curtains}
                  gate={gate}
                  music={music}
                  security={security}
                  tv={tv}
                  temp={temp}
                  carTarget={carTarget}
                  carParked={carParked}
                  carMoving={carMoving}
                  onToggleGate={handleGateToggle}
                />
              </div>

              {/* scene status chip */}
              <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-gold/25 bg-black/55 px-3 py-1.5 backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full ${security ? "bg-red-400" : "bg-gold"}`} />
                <span className="text-[11px] font-medium text-stone-100">{sceneLabel}</span>
              </div>
            </div>
          </motion.div>

          {/* ---------------- RIGHT · phone controller ---------------- */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="lg:col-span-4">
            <div className="relative mx-auto w-full max-w-[330px]">
              <div className="relative rounded-[2.6rem] border border-white/15 bg-gradient-to-b from-neutral-900 to-black p-2.5 shadow-[0_40px_90px_-25px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.04)]">
                <div className="absolute left-1/2 top-[18px] z-30 h-[22px] w-28 -translate-x-1/2 rounded-full bg-black" />
                <div className="relative overflow-hidden rounded-[2.1rem] bg-gradient-to-b from-[#111114] to-[#050506]">
                  <div className="px-5 pb-6 pt-9">
                    <div className="mb-4 flex items-center justify-between text-[10px] text-stone-500">
                      <span>9:41</span>
                      <span className="tracking-widest">DURO&nbsp;HOME</span>
                      <span>5G ·  100%</span>
                    </div>
                    <div className="mb-4">
                      <h3 className="font-display text-2xl font-medium text-white leading-tight">My Residence</h3>
                      <p className="text-[11px] text-stone-400">
                        {[lights && "Lights", fan && `Fan (${fanSpeed === "low" ? "Low" : fanSpeed === "medium" ? "Med" : "High"})`, tv && "TV", music && "Music", security && "Armed"].filter(Boolean).join(" · ") || "All quiet"}
                      </p>
                    </div>
                    <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 text-gold"><ThermoI /></span>
                        <span className="text-xs text-stone-300">Climate</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={bump(-1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-stone-200 transition hover:border-gold hover:text-gold active:scale-90" aria-label="Cooler">−</button>
                        <span className="w-12 text-center text-base font-semibold text-white tabular-nums">{temp}°C</span>
                        <button type="button" onClick={bump(1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-stone-200 transition hover:border-gold hover:text-gold active:scale-90" aria-label="Warmer">+</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <StatCard icon={<Bulb />} label="Lights" value={lights ? "On" : "Off"} active={lights} onClick={tog(setLights)} />
                      <StatCard icon={<FanI />} label="Fan" value={fan ? (fanSpeed === "low" ? "Low" : fanSpeed === "medium" ? "Med" : "High") : "Off"} active={fan} onClick={toggleFan} />
                      <StatCard icon={<CurtainI />} label="Curtains" value={curtains ? "Open" : "Closed"} active={curtains} onClick={tog(setCurtains)} />
                      <StatCard
                        icon={<GateI />}
                        label="Gate"
                        value={gateStatusText || (gate ? "Open" : carParked ? "Parked" : "Closed")}
                        active={gate || carParked}
                        onClick={handleGateToggle}
                      />
                      <StatCard icon={<MusicI />} label="Music" value={music ? "Playing" : "Off"} active={music} onClick={tog(setMusic)} />
                      <StatCard icon={<ShieldI />} label="Security" value={security ? "Armed" : "Off"} active={security} activeColor="red" onClick={tog(setSecurity)} />
                      <button type="button" onClick={tog(setTv)} className={`col-span-3 flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 active:scale-[0.98] ${tv ? "border-gold/60 bg-gold/[0.12] shadow-[0_0_0_1px_rgba(245,166,35,0.4),0_0_22px_-6px_rgba(245,166,35,0.6)]" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"}`}>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg p-1.5 transition-colors duration-300 ${tv ? "bg-gold text-black" : "bg-white/[0.06] text-stone-300"}`}><TvI /></span>
                        <span className="flex-1 text-[11px] uppercase tracking-[0.14em] text-stone-400">Television</span>
                        <span className={`text-[13px] font-semibold ${tv ? "text-gold" : "text-stone-200"}`}>{tv ? "On" : "Off"}</span>
                      </button>
                    </div>

                    {/* Fan speed controller — expands smoothly when Fan is ON */}
                    <div className={`grid transition-all duration-500 ease-out ${fan ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
                      <div className="overflow-hidden">
                        <div className="flex items-center justify-between rounded-2xl border border-gold/30 bg-gold/[0.08] px-4 py-3 shadow-[0_0_20px_-8px_rgba(245,166,35,0.4)]">
                          <div>
                            <p className="text-[12px] font-semibold text-white">Fan Speed</p>
                            <p className="text-[10px] text-stone-400 capitalize">{fanSpeed} Airflow</p>
                          </div>
                          <div className="flex items-center gap-1 rounded-xl bg-black/60 p-1 border border-white/10">
                            {(["low", "medium", "high"] as const).map((spd) => {
                              const active = fanSpeed === spd;
                              return (
                                <button
                                  key={spd}
                                  type="button"
                                  onClick={() => {
                                    setFanSpeed(spd);
                                    setScene(null);
                                  }}
                                  className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                                    active
                                      ? "bg-gold text-black shadow-[0_0_12px_rgba(245,166,35,0.5)]"
                                      : "text-stone-400 hover:text-white hover:bg-white/[0.06]"
                                  }`}
                                >
                                  {spd === "low" ? "Low" : spd === "medium" ? "Med" : "High"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`grid transition-all duration-500 ${music ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] px-3.5 py-3">
                          <div className="flex h-8 items-end gap-[3px]">
                            {[0, 1, 2, 3, 4].map((i) => (<span key={i} className="duro-eq w-[3px] rounded-full bg-gold" style={{ height: "100%", animationDelay: `${i * 0.11}s` }} />))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-stone-100">Evening Ambience</p>
                            <p className="truncate text-[10px] text-stone-400">DURO Radio · Lounge</p>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-gold" />
                        </div>
                      </div>
                    </div>
                    <div className={`grid transition-all duration-500 ${security ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-2 gap-2.5">
                          {["Entry Cam", "Driveway"].map((cam) => (
                            <div key={cam} className="relative aspect-video overflow-hidden rounded-xl border border-red-400/20 bg-black">
                              <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)", backgroundSize: "100% 7px" }} />
                              <div className="duro-scan absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-red-500/25 to-transparent" />
                              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 text-[8px] font-semibold text-red-300"><span className="duro-rec h-1.5 w-1.5 rounded-full bg-red-500" /> REC</span>
                              <span className="absolute bottom-1.5 left-1.5 text-[8px] text-stone-400">{cam}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mb-2 mt-4 text-[10px] uppercase tracking-[0.16em] text-stone-500">Scenes</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {([["morning", "Good Morning"], ["evening", "Good Evening"], ["arm", "Arm Outside"], ["away", "Home Away"]] as [Exclude<Scene, null>, string][]).map(([key, label]) => {
                        const on = scene === key;
                        return (
                          <button key={key} type="button" onClick={applyScene(key)} className={`rounded-xl border px-3 py-2.5 text-[12px] font-medium transition-all duration-300 active:scale-[0.97] ${on ? "border-gold/50 bg-gradient-to-b from-gold/25 to-gold/10 text-gold shadow-[0_0_20px_-6px_rgba(245,166,35,0.6)]" : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/25 hover:text-white"}`}>{label}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-stone-500">Everything here is live — tap to try it.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
