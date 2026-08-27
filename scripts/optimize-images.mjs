import sharp from "sharp";
import { mkdirSync, readdirSync, rmSync } from "fs";
import path from "path";

const DL = "C:/Users/vks10/Downloads";
const OUT = path.resolve("public/images");
mkdirSync(OUT, { recursive: true });

// clear stale jpgs so renamed journeys never mix
for (const f of readdirSync(OUT)) {
  if (f.endsWith(".jpg")) rmSync(path.join(OUT, f));
}

const IMAGES = [
  ["ChatGPT Image Jul 8, 2026, 09_58_16 PM.png", "01-exterior.jpg"],
  ["ChatGPT Image Jul 8, 2026, 10_00_06 PM.png", "02-gate.jpg"],
  ["ChatGPT Image Jul 9, 2026, 10_08_17 PM.png", "03-maindoor.jpg"],
  ["ChatGPT Image Jul 9, 2026, 10_10_13 PM.png", "04-foyer.jpg"],
  ["ChatGPT Image Jul 8, 2026, 10_10_29 PM.png", "05-hall.jpg"],
  ["ChatGPT Image Jul 9, 2026, 09_56_17 PM.png", "06-corridor.jpg"],
  ["ChatGPT Image Jul 8, 2026, 10_13_08 PM.png", "07-bedroom.jpg"],
  ["ChatGPT Image Jul 8, 2026, 10_19_27 PM.png", "08-kitchen.jpg"],
  ["ChatGPT Image Jul 9, 2026, 10_12_16 PM.png", "09-bathdoor.jpg"],
  ["ChatGPT Image Jul 8, 2026, 10_20_53 PM.png", "10-bathroom.jpg"],
  ["ChatGPT Image Jul 8, 2026, 10_24_27 PM.png", "11-balcony.jpg"],
  ["ChatGPT Image Jul 9, 2026, 10_14_56 PM.png", "12-garden.jpg"],
];

for (const [src, dst] of IMAGES) {
  const input = path.join(DL, src);
  const output = path.join(OUT, dst);
  const img = sharp(input).resize({ width: 2048, withoutEnlargement: true });
  await img.jpeg({ quality: 84, mozjpeg: true }).toFile(output);
  const meta = await sharp(output).metadata();
  console.log(`${dst}: ${meta.width}x${meta.height}`);
}
console.log("done");
