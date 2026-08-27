"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Live smart-home controller.  RIGHT = a real DURO phone panel;      */
/*  tapping a card / scene updates React state and the LEFT isometric   */
/*  "digital twin" of the residence reacts in real time — lights pool,  */
/*  the fan spins, the gate slides, curtains part, cameras arm, music   */
/*  plays.  Original DURO styling: black + gold, cinematic.             */
/* ------------------------------------------------------------------ */

type Scene = "morning" | "evening" | "arm" | "away" | null;

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

// iso projection — x runs back-right, y runs back-left, z is up
const SX = 30, SY = 15, SZ = 20, OX = 262, OY = 74;
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

// soft contact shadow on the floor
function Shad({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return (
    <ellipse cx={CX(x + w / 2, y + d / 2)} cy={CY(x + w / 2, y + d / 2)} rx={(w + d) * 9} ry={(w + d) * 4.5} fill="rgba(0,0,0,0.38)" filter="url(#soft)" />
  );
}

function Floor({ x0, y0, x1, y1, fill }: { x0: number; y0: number; x1: number; y1: number; fill: string }) {
  return <polygon points={`${P(x0, y0)} ${P(x1, y0)} ${P(x1, y1)} ${P(x0, y1)}`} fill={fill} stroke="rgba(200,162,95,0.10)" strokeWidth={1} />;
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
  return (
    <g>
      <Box x={x} y={y} w={0.26 * s} d={0.26 * s} h={0.3 * s} c={["#6a5340", "#4f3b28", "#38291c"]} />
      <Box x={x - 0.07 * s} y={y - 0.07 * s} w={0.4 * s} d={0.4 * s} h={0.52 * s} z={0.3 * s} c={LEAF} />
    </g>
  );
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
  lights, fan, curtains, gate, music, security, tv, temp,
}: {
  lights: boolean; fan: boolean; curtains: boolean; gate: boolean; music: boolean; security: boolean; tv: boolean; temp: number;
}) {
  const coolI = Math.max(0.12, Math.min(0.95, 0.3 + (24 - temp) * 0.07));

  // gate swing (0 = closed, 1 = fully open) — spring so both leaves swing smoothly inward
  const gTarget = useMotionValue(gate ? 1 : 0);
  const gSpring = useSpring(gTarget, { stiffness: 150, damping: 22 });
  const [gv, setGv] = useState(gate ? 1 : 0);
  useEffect(() => { gTarget.set(gate ? 1 : 0); }, [gate, gTarget]);
  useMotionValueEvent(gSpring, "change", (v) => setGv(v));

  // a car drives in a moment after the gate opens (and reverses out when it closes)
  const cTarget = useMotionValue(gate ? 1 : 0);
  const cSpring = useSpring(cTarget, { stiffness: 55, damping: 16 });
  const [cv, setCv] = useState(gate ? 1 : 0);
  useEffect(() => {
    if (gate) { const id = setTimeout(() => cTarget.set(1), 320); return () => clearTimeout(id); }
    cTarget.set(0);
  }, [gate, cTarget]);
  useMotionValueEvent(cSpring, "change", (v) => setCv(v));

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
    <svg viewBox="16 28 556 352" className="h-full w-full" style={{ overflow: "visible" }}>
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
      <polygon points={`${P(5.8, 8)} ${P(9.1, 8)} ${P(9.1, 8.9)} ${P(5.8, 8.9)}`} fill="#22242c" stroke="rgba(200,162,95,0.12)" />
      <polygon points={`${P(6.4, 8)} ${P(8.5, 8)} ${P(8.5, 8.8)} ${P(6.4, 8.8)}`} fill="none" stroke="rgba(200,162,95,0.1)" />

      {/* rugs */}
      <polygon points={`${P(0.9, 1)} ${P(3.7, 1)} ${P(3.7, 3.3)} ${P(0.9, 3.3)}`} fill="rgba(196,124,68,0.22)" stroke="rgba(200,162,95,0.3)" />
      <polygon points={`${P(1.4, 1.4)} ${P(3.2, 1.4)} ${P(3.2, 2.9)} ${P(1.4, 2.9)}`} fill="none" stroke="rgba(200,162,95,0.2)" />
      <polygon points={`${P(1.1, 5)} ${P(3.9, 5)} ${P(3.9, 7.3)} ${P(1.1, 7.3)}`} fill="rgba(160,148,168,0.15)" stroke="rgba(200,162,95,0.16)" />
      <polygon points={`${P(6.6, 6)} ${P(8.9, 6)} ${P(8.9, 7.6)} ${P(6.6, 7.6)}`} fill="rgba(160,128,96,0.13)" stroke="rgba(200,162,95,0.14)" />

      {/* ---------- WARM LIGHT POOLS + AMBIENT ---------- */}
      <g>
        <Glow x={2.4} y={2} r={112} on={lights} />
        <Glow x={7.4} y={1.3} r={82} on={lights} />
        <Glow x={7.5} y={3.9} r={92} on={lights} />
        <Glow x={2.4} y={6} r={108} on={lights} />
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
      <Box x={4.93} y={2.1} w={0.13} d={3.4} h={1.05} c={WALL} />
      <Box x={4.93} y={6.3} w={0.13} d={1.7} h={1.05} c={WALL} />
      {/* Dining | Kitchen (y≈2.6) — doorway at x7.0..7.9 */}
      <Box x={5} y={2.54} w={2.0} d={0.13} h={1.05} c={WALL} />
      <Box x={7.9} y={2.54} w={2.1} d={0.13} h={1.05} c={WALL} />
      {/* Kitchen | Entry (y≈5.3) — doorway at x7.0..7.9 */}
      <Box x={5} y={5.24} w={2.0} d={0.13} h={1.05} c={WALL} />
      <Box x={7.9} y={5.24} w={2.1} d={0.13} h={1.05} c={WALL} />

      {/* wall art on the living-room left wall */}
      <polygon points={`${P(0.11, 1.0, 0.82)} ${P(0.11, 1.7, 0.82)} ${P(0.11, 1.7, 1.24)} ${P(0.11, 1.0, 1.24)}`} fill="#17130c" stroke="rgba(200,162,95,0.5)" strokeWidth="1" />
      <polygon points={`${P(0.11, 2.15, 0.86)} ${P(0.11, 2.95, 0.86)} ${P(0.11, 2.95, 1.2)} ${P(0.11, 2.15, 1.2)}`} fill="#191307" stroke="rgba(200,162,95,0.42)" strokeWidth="1" />

      {/* ============ LIVING ============ */}
      <Shad x={0.9} y={2.4} w={2.9} d={0.9} />
      <Box x={1} y={2.4} w={2.6} d={0.9} h={0.5} c={SOFA} />{/* seat */}
      <Box x={1} y={2.4} w={2.6} d={0.26} h={0.92} c={SOFA} />{/* back */}
      <Box x={0.78} y={2.4} w={0.24} d={0.9} h={0.6} c={SOFA} />{/* arm L */}
      <Box x={3.58} y={2.4} w={0.24} d={0.9} h={0.6} c={SOFA} />{/* arm R */}
      <Box x={1.5} y={2.55} w={0.5} d={0.45} h={0.16} z={0.5} c={CREAM} />{/* cushion */}
      <Box x={2.6} y={2.55} w={0.5} d={0.45} h={0.16} z={0.5} c={["#c1965f", "#9f7a4a", "#7e5f38"]} />{/* cushion */}
      <Box x={1.7} y={1.45} w={1} d={0.6} h={0.24} c={WARMW} />{/* coffee table */}
      <Box x={1.85} y={1.6} w={0.42} d={0.28} h={0.08} z={0.24} c={DARK} />{/* books */}
      <Box x={0.72} y={1.5} w={0.55} d={0.55} h={0.3} c={SOFA} />{/* ottoman */}
      <Shad x={1.4} y={0.2} w={1.5} d={0.4} />
      <Box x={1.4} y={0.2} w={1.5} d={0.4} h={0.42} c={DARK} />{/* media console */}
      {/* TV — reacts to the remote's TV toggle */}
      <polygon points={`${P(1.45, 0.16, 0.6)} ${P(2.75, 0.16, 0.6)} ${P(2.75, 0.16, 1.02)} ${P(1.45, 0.16, 1.02)}`} fill="#0a0d12" stroke="rgba(200,162,95,0.35)" strokeWidth="1" />
      <polygon points={`${P(1.52, 0.16, 0.65)} ${P(2.68, 0.16, 0.65)} ${P(2.68, 0.16, 0.97)} ${P(1.52, 0.16, 0.97)}`} fill={tv ? "url(#tvOn)" : "#0c0f15"} style={{ transition: "fill 500ms" }} />
      {tv && <ellipse cx={CX(2.1, 0.55)} cy={CY(2.1, 0.55, 0.82)} rx="34" ry="20" fill="#4d8be6" opacity="0.2" style={{ mixBlendMode: "screen" }} />}
      <Box x={0.4} y={0.5} w={0.2} d={0.2} h={1.5} c={METAL} />{/* floor lamp */}
      <ellipse cx={CX(0.5, 0.6)} cy={CY(0.5, 0.6, 1.5)} rx="17" ry="10" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 1 : 0, transition: "opacity 700ms" }} />
      <Plant x={0.5} y={3.4} />
      {/* ceiling fan */}
      <g transform={`translate(${CX(2.5, 1.85)} ${CY(2.5, 1.85, 1.62)})`}>
        <line x1="0" y1="-15" x2="0" y2="-3" stroke="rgba(170,170,180,0.45)" strokeWidth="1.4" />
        <ellipse cx="0" cy="9" rx="32" ry="16" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 0.6 : 0, transition: "opacity 700ms" }} />
        <g transform="scale(1,0.5)">
          <g className={fan ? "duro-fan" : ""} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <g fill="rgba(222,216,204,0.94)" stroke="rgba(90,70,40,0.35)" strokeWidth="0.7">
              <ellipse cx="0" cy="0" rx="37" ry="10" />
              <ellipse cx="0" cy="0" rx="10" ry="37" />
            </g>
            <circle r="8" fill="#c8a25f" />
            <circle r="3.2" fill="#6e5222" />
          </g>
        </g>
      </g>
      {/* wall-mounted split AC + cool air (stronger when temp is lower) */}
      <Box x={3.0} y={0.12} w={1.3} d={0.16} h={0.34} z={1.08} c={["#eceef2", "#d2d5db", "#b5b8bf"]} />
      <polygon points={`${P(3.03, 0.12, 1.1)} ${P(4.27, 0.12, 1.1)} ${P(4.27, 0.12, 1.14)} ${P(3.03, 0.12, 1.14)}`} fill="rgba(120,180,215,0.55)" />
      <g style={{ opacity: coolI }}>
        {[0, 1, 2].map((i) => (
          <rect key={i} className="duro-cool" x={CX(3.35 + i * 0.35, 0.26)} y={CY(3.35 + i * 0.35, 0.26, 1.02)} width="2" height="10" rx="1" fill="rgba(155,205,235,0.9)" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
      </g>

      {/* ============ DINING ============ */}
      <Box x={7.3} y={0.15} w={1.6} d={0.36} h={0.55} c={WARMW} />{/* sideboard */}
      <polygon points={`${P(7.5, 0.13, 0.75)} ${P(8.6, 0.13, 0.75)} ${P(8.6, 0.13, 1.15)} ${P(7.5, 0.13, 1.15)}`} fill="#141009" stroke="rgba(200,162,95,0.42)" strokeWidth="1" />
      <Shad x={6.6} y={0.8} w={1.8} d={0.9} />
      <Box x={6.6} y={0.8} w={1.8} d={0.9} h={0.48} c={WARMW} />{/* table */}
      <polygon points={`${P(6.75, 0.95, 0.49)} ${P(8.25, 0.95, 0.49)} ${P(8.25, 1.55, 0.49)} ${P(6.75, 1.55, 0.49)}`} fill="rgba(200,162,95,0.14)" />
      <Box x={7.35} y={1.05} w={0.18} d={0.18} h={0.32} z={0.48} c={LEAF} />{/* centerpiece */}
      {[[6.4, 0.7], [8.5, 0.7], [6.4, 1.75], [8.5, 1.75]].map(([cx, cy], i) => (
        <Box key={i} x={cx} y={cy} w={0.4} d={0.4} h={0.66} c={DARK} />
      ))}
      <Plant x={9.35} y={0.4} />
      <Pendant x={7.5} y={1.25} on={lights} />

      {/* ============ KITCHEN ============ */}
      <Box x={5.3} y={2.8} w={0.7} d={2.2} h={0.85} c={STONE} />{/* base counter */}
      <Box x={5.3} y={2.85} w={0.4} d={2.1} h={0.4} z={1.25} c={STONE} />{/* upper cabinets */}
      <Shad x={6.8} y={3.3} w={2} d={1} />
      <Box x={6.8} y={3.3} w={2} d={1} h={0.9} c={STONE} />{/* island */}
      <Box x={6.75} y={3.25} w={2.1} d={1.1} h={0.14} z={0.9} c={MARB} />{/* marble top */}
      <Box x={7.0} y={3.5} w={0.32} d={0.32} h={0.12} z={1.04} c={["#c1965f", "#9f7a4a", "#7e5f38"]} />{/* fruit bowl */}
      {[[7, 4.5], [8.1, 4.5]].map(([cx, cy], i) => (
        <Box key={i} x={cx} y={cy} w={0.32} d={0.32} h={0.6} c={DARK} />
      ))}
      <Pendant x={7.2} y={3.7} on={lights} />
      <Pendant x={8.1} y={3.95} on={lights} />

      {/* ============ SUITE ============ */}
      <Box x={4.15} y={4.25} w={0.62} d={1.5} h={1.45} c={WOOD} />{/* wardrobe */}
      <polygon points={`${P(4.15, 4.98, 0.15)} ${P(4.15, 4.98, 1.4)} ${P(4.15, 5.02, 1.4)} ${P(4.15, 5.02, 0.15)}`} fill="rgba(0,0,0,0.28)" />
      <Shad x={1.2} y={5.4} w={2.6} d={1.9} />
      <Box x={1.2} y={5.4} w={2.6} d={1.9} h={0.42} c={WOOD} />{/* bed base */}
      <Box x={1.35} y={5.9} w={2.4} d={1.5} h={0.32} z={0.42} c={CREAM} />{/* duvet */}
      <Box x={1.45} y={5.52} w={0.85} d={0.32} h={0.18} z={0.42} c={["#f4eee2", "#d8cfbd", "#b2a996"]} />{/* pillow */}
      <Box x={2.5} y={5.52} w={0.85} d={0.32} h={0.18} z={0.42} c={["#f4eee2", "#d8cfbd", "#b2a996"]} />{/* pillow */}
      <Box x={1.2} y={5.4} w={2.6} d={0.22} h={1.0} c={WOOD} />{/* headboard */}
      <Box x={1.2} y={7.35} w={0.5} d={0.5} h={0.55} c={WARMW} />{/* nightstand L */}
      <Box x={3.3} y={7.35} w={0.5} d={0.5} h={0.55} c={WARMW} />{/* nightstand R */}
      <ellipse cx={CX(1.45, 7.6)} cy={CY(1.45, 7.6, 0.62)} rx="9" ry="5" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 0.85 : 0, transition: "opacity 700ms" }} />
      <ellipse cx={CX(3.55, 7.6)} cy={CY(3.55, 7.6, 0.62)} rx="9" ry="5" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: lights ? 0.85 : 0, transition: "opacity 700ms" }} />
      <Box x={1.85} y={7.4} w={1.3} d={0.32} h={0.28} c={WARMW} />{/* bench */}
      <Plant x={3.75} y={4.4} />
      {/* window + SMOOTH sliding curtains (transform-driven) on x=0 wall */}
      <polygon points={`${P(0.13, 5, 0.4)} ${P(0.13, 7.2, 0.4)} ${P(0.13, 7.2, 1.45)} ${P(0.13, 5, 1.45)}`} fill={curtains ? "rgba(255,205,140,0.34)" : "rgba(90,120,165,0.24)"} style={{ transition: "fill 900ms ease" }} />
      <g style={{ transform: curtains ? "translate(15px,-7.5px)" : "translate(0px,0px)", transition: "transform 950ms cubic-bezier(0.4,0,0.2,1)" }}>
        <polygon points={`${P(0.1, 5.05, 0.42)} ${P(0.1, 6.05, 0.42)} ${P(0.1, 6.05, 1.48)} ${P(0.1, 5.05, 1.48)}`} fill="rgba(200,162,95,0.6)" />
        {[0, 1, 2].map((i) => (<line key={i} x1={CX(0.1, 5.25 + i * 0.27)} y1={CY(0.1, 5.25 + i * 0.27, 0.42)} x2={CX(0.1, 5.25 + i * 0.27)} y2={CY(0.1, 5.25 + i * 0.27, 1.48)} stroke="rgba(0,0,0,0.13)" strokeWidth="1" />))}
      </g>
      <g style={{ transform: curtains ? "translate(-15px,7.5px)" : "translate(0px,0px)", transition: "transform 950ms cubic-bezier(0.4,0,0.2,1)" }}>
        <polygon points={`${P(0.1, 6.15, 0.42)} ${P(0.1, 7.15, 0.42)} ${P(0.1, 7.15, 1.48)} ${P(0.1, 6.15, 1.48)}`} fill="rgba(200,162,95,0.6)" />
        {[0, 1, 2].map((i) => (<line key={i} x1={CX(0.1, 6.35 + i * 0.27)} y1={CY(0.1, 6.35 + i * 0.27, 0.42)} x2={CX(0.1, 6.35 + i * 0.27)} y2={CY(0.1, 6.35 + i * 0.27, 1.48)} stroke="rgba(0,0,0,0.13)" strokeWidth="1" />))}
      </g>
      <Pendant x={2.4} y={6.1} on={lights} />

      {/* ============ ENTRY ============ */}
      <Box x={5.4} y={5.6} w={1.4} d={0.4} h={0.55} c={WARMW} />{/* console */}
      <Plant x={6.6} y={5.5} s={1.1} />
      <Plant x={9.3} y={6.4} s={0.9} />
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
      <g>
        <polygon points={`${P(5.85, 8, 0)} ${P(lfx, lfy, 0)} ${P(lfx, lfy, H)} ${P(5.85, 8, H)}`} fill="rgba(32,34,40,0.5)" stroke={METAL[0]} strokeWidth="1" />
        <line x1={CX(5.85, 8)} y1={CY(5.85, 8, H)} x2={CX(lfx, lfy)} y2={CY(lfx, lfy, H)} stroke={METAL[0]} strokeWidth="1.4" />
        <line x1={CX(5.85, 8)} y1={CY(5.85, 8, 0.56)} x2={CX(lfx, lfy)} y2={CY(lfx, lfy, 0.56)} stroke={METAL[0]} strokeWidth="1" />
        {[0.22, 0.44, 0.66, 0.88].map((f, i) => { const bx = lerp(5.85, lfx, f), by = lerp(8, lfy, f); return <line key={i} x1={CX(bx, by)} y1={CY(bx, by, 0.05)} x2={CX(bx, by)} y2={CY(bx, by, H)} stroke={METAL[1]} strokeWidth="1.5" />; })}
      </g>
      {/* RIGHT leaf — hinged at right post, swings inward */}
      <g>
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

      {/* ---------- CAR — drives in through the open gate ---------- */}
      {(gate || cv > 0.01) && (() => {
        const cy = lerp(9.9, 7.0, cv);
        const ccx = CX(7.4, cy), ccy = CY(7.4, cy, 0.15);
        return (
          <g transform={`translate(${ccx} ${ccy}) scale(1.3) translate(${-ccx} ${-ccy})`}>
            <Shad x={7.04} y={cy - 0.68} w={0.72} d={1.36} />
            {/* wheels */}
            <Box x={6.99} y={cy - 0.5} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            <Box x={6.99} y={cy + 0.18} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            <Box x={7.69} y={cy - 0.5} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            <Box x={7.69} y={cy + 0.18} w={0.1} d={0.32} h={0.13} c={["#1b1b1f", "#141417", "#0e0e10"]} />
            {/* body + glass cabin */}
            <Box x={7.04} y={cy - 0.68} w={0.72} d={1.36} h={0.3} z={0.06} c={["#48505e", "#373d48", "#282d35"]} />
            <Box x={7.14} y={cy - 0.16} w={0.52} d={0.66} h={0.26} z={0.36} c={["#9db8cf", "#7890a6", "#5b7082"]} />
            {/* headlight beam (front = -y, direction of travel) */}
            <ellipse cx={CX(7.4, cy - 1.5)} cy={CY(7.4, cy - 1.5, 0.15)} rx="30" ry="15" fill="url(#warm)" style={{ mixBlendMode: "screen", opacity: 0.55 }} />
            <ellipse cx={CX(7.19, cy - 0.68)} cy={CY(7.19, cy - 0.68, 0.22)} rx="2.4" ry="1.6" fill="#fff4d2" />
            <ellipse cx={CX(7.61, cy - 0.68)} cy={CY(7.61, cy - 0.68, 0.22)} rx="2.4" ry="1.6" fill="#fff4d2" />
            {/* tail lights (rear = +y) */}
            <ellipse cx={CX(7.19, cy + 0.68)} cy={CY(7.19, cy + 0.68, 0.24)} rx="2" ry="1.3" fill="#ff5555" />
            <ellipse cx={CX(7.61, cy + 0.68)} cy={CY(7.61, cy + 0.68, 0.24)} rx="2" ry="1.3" fill="#ff5555" />
          </g>
        );
      })()}

      {/* ---------- AUTOMATION MESH ---------- */}
      <g style={{ opacity: 0.9 }}>
        <polyline className="duro-dash" points={`${P(2.4, 2, 0.05)} ${P(7.5, 1.25, 0.05)} ${P(7.8, 3.8, 0.05)} ${P(7.4, 6.9, 0.05)} ${P(2.4, 6, 0.05)} ${P(2.4, 2, 0.05)}`} fill="none" stroke="rgba(200,162,95,0.26)" strokeWidth="1" strokeDasharray="3 6" />
        {[[2.4, 2], [7.5, 1.25], [7.8, 3.8], [2.4, 6], [7.4, 6.9]].map(([x, y], i) => (
          <circle key={i} className="duro-node" cx={CX(x, y)} cy={CY(x, y, 0.05)} r="2.6" fill="#c8a25f" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>

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
    : "border-gold/60 bg-gold/[0.12] shadow-[0_0_0_1px_rgba(200,162,95,0.4),0_0_22px_-6px_rgba(200,162,95,0.6)]";
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
  const [curtains, setCurtains] = useState(false);
  const [gate, setGate] = useState(false);
  const [music, setMusic] = useState(false);
  const [security, setSecurity] = useState(false);
  const [tv, setTv] = useState(false);
  const [temp, setTemp] = useState(23);
  const [scene, setScene] = useState<Scene>(null);

  const tog = (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => { setter((v) => !v); setScene(null); };
  const bump = (d: number) => () => { setTemp((t) => Math.max(16, Math.min(30, t + d))); setScene(null); };
  const applyScene = (s: Exclude<Scene, null>) => () => {
    setScene(s);
    if (s === "morning") { setLights(true); setCurtains(true); setFan(false); setMusic(true); setSecurity(false); setGate(false); setTv(false); setTemp(22); }
    if (s === "evening") { setLights(true); setCurtains(false); setFan(true); setMusic(true); setSecurity(false); setGate(false); setTv(true); setTemp(24); }
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
                <IsoHome lights={lights} fan={fan} curtains={curtains} gate={gate} music={music} security={security} tv={tv} temp={temp} />
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
                        {[lights && "Lights", fan && "Fan", tv && "TV", music && "Music", security && "Armed"].filter(Boolean).join(" · ") || "All quiet"}
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
                      <StatCard icon={<FanI />} label="Fan" value={fan ? "On" : "Off"} active={fan} onClick={tog(setFan)} />
                      <StatCard icon={<CurtainI />} label="Curtains" value={curtains ? "Open" : "Closed"} active={curtains} onClick={tog(setCurtains)} />
                      <StatCard icon={<GateI />} label="Gate" value={gate ? "Open" : "Closed"} active={gate} onClick={tog(setGate)} />
                      <StatCard icon={<MusicI />} label="Music" value={music ? "Playing" : "Off"} active={music} onClick={tog(setMusic)} />
                      <StatCard icon={<ShieldI />} label="Security" value={security ? "Armed" : "Off"} active={security} activeColor="red" onClick={tog(setSecurity)} />
                      <button type="button" onClick={tog(setTv)} className={`col-span-3 flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 active:scale-[0.98] ${tv ? "border-gold/60 bg-gold/[0.12] shadow-[0_0_0_1px_rgba(200,162,95,0.4),0_0_22px_-6px_rgba(200,162,95,0.6)]" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"}`}>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg p-1.5 transition-colors duration-300 ${tv ? "bg-gold text-black" : "bg-white/[0.06] text-stone-300"}`}><TvI /></span>
                        <span className="flex-1 text-[11px] uppercase tracking-[0.14em] text-stone-400">Television</span>
                        <span className={`text-[13px] font-semibold ${tv ? "text-gold" : "text-stone-200"}`}>{tv ? "On" : "Off"}</span>
                      </button>
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
                          <button key={key} type="button" onClick={applyScene(key)} className={`rounded-xl border px-3 py-2.5 text-[12px] font-medium transition-all duration-300 active:scale-[0.97] ${on ? "border-gold/50 bg-gradient-to-b from-gold/25 to-gold/10 text-gold shadow-[0_0_20px_-6px_rgba(200,162,95,0.6)]" : "border-white/10 bg-white/[0.03] text-stone-300 hover:border-white/25 hover:text-white"}`}>{label}</button>
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
