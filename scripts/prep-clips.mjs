/**
 * Prepare walking clips for scroll-scrubbing.
 *
 * Source clips go in assets/clips-src/. For each one this script:
 *  - strips audio,
 *  - removes the generator watermark (per-clip: a bottom crop for the Kling
 *    clips, or an in-place delogo box for the corner-sparkle generator so no
 *    framing is lost),
 *  - re-encodes ALL-INTRA (keyint=1) at CRF 16 (visually lossless, no
 *    downscaling) so the browser can seek to ANY scroll position instantly
 *    and exactly — this is what makes forward AND reverse scrubbing smooth,
 *  - writes the result to public/clips/<same-name>.mp4.
 *
 * Usage: npm run prep-clips
 */
import { execFileSync } from "child_process";
import { mkdirSync, readdirSync } from "fs";
import path from "path";
import ffmpeg from "ffmpeg-static";

const SRC = path.resolve("assets/clips-src");
const OUT = path.resolve("public/clips");
mkdirSync(OUT, { recursive: true });

// Per-clip watermark removal. Different generators stamp different marks:
//  - "crop": Kling clips — a strip along the bottom; crop it off.
//  - "delogo": the corner-sparkle generator — a small ✦ bottom-right; paint
//    over it in place (box is in SOURCE pixels) and keep the full frame.
const WATERMARK = {
  "02-gate-to-door.mp4": { mode: "crop", keep: 0.915 },
  "03-door-to-hall.mp4": { mode: "crop", keep: 0.915 },
  "04-corridor-to-bedroom.mp4": {
    mode: "delogo",
    box: { x: 1095, y: 560, w: 130, h: 135 },
  },
  "06-corridor-to-kitchen.mp4": {
    mode: "delogo",
    box: { x: 1095, y: 560, w: 130, h: 135 },
  },
  "07-corridor-to-bathroom.mp4": {
    mode: "delogo",
    box: { x: 1095, y: 560, w: 130, h: 135 },
  },
  "09-corridor-to-balcony.mp4": {
    mode: "delogo",
    box: { x: 1095, y: 560, w: 130, h: 135 },
  },
  "01-gate-to-door.mp4": {
    mode: "delogo",
    box: { x: 1095, y: 560, w: 130, h: 135 },
  },
};
const DEFAULT = { mode: "crop", keep: 0.915 };

function filterFor(file) {
  const cfg = WATERMARK[file] ?? DEFAULT;
  let filter = "";
  if (cfg.mode === "delogo") {
    const { x, y, w, h } = cfg.box;
    filter = `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
  } else {
    // even height for yuv420p
    filter = `crop=iw:floor(ih*${cfg.keep}/2)*2:0:0`;
  }
  // Keep 540p so decode stays fast enough to never trail on scroll ("previous
  // frames"), but denoise + sharpen so the clip still looks crisp — quality
  // without the decode cost of a higher resolution. Still photos stay hi-res.
  return (
    `${filter},hqdn3d=1.6:1.2:5:5,scale=-2:540,` +
    `unsharp=5:5:0.6:5:5:0.0,eq=contrast=1.03:saturation=1.04`
  );
}

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith(".mp4"));
if (files.length === 0) {
  console.log("No .mp4 files in assets/clips-src — nothing to do.");
  process.exit(0);
}

for (const file of files) {
  const input = path.join(SRC, file);
  const output = path.join(OUT, file);
  console.log(`encoding ${file} ...`);
  execFileSync(
    ffmpeg,
    [
      "-y",
      "-i", input,
      "-an",
      "-vf", filterFor(file),
      "-c:v", "libx264",
      "-preset", "slow", // better quality/compression; still all-intra
      "-crf", "20", // crisper (decode cost is set by resolution, not crf)
      "-x264-params", "keyint=1:min-keyint=1:bframes=0:scenecut=0",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      output,
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}
console.log("done — clips written to public/clips/");
