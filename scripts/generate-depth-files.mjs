// Generate depth maps for SPECIFIC stills (pass basenames as args).
// e.g. node scripts/generate-depth-files.mjs 06b-corridor-bed.jpg 07-bedroom.jpg
import { pipeline, RawImage } from "@huggingface/transformers";
import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";

const IMG = path.resolve("public/images");
const OUT = path.resolve("public/images/depth");
mkdirSync(OUT, { recursive: true });

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("pass one or more jpg basenames");
  process.exit(1);
}

console.log("loading depth model (cached after first run)...");
const estimator = await pipeline(
  "depth-estimation",
  "onnx-community/depth-anything-v2-small"
);

async function loadRaw(file) {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
}

for (const f of files) {
  const input = await loadRaw(path.join(IMG, f));
  const { depth } = await estimator(input);
  const out = path.join(OUT, f.replace(".jpg", "-depth.png"));
  const buf = await sharp(Buffer.from(depth.data), {
    raw: { width: depth.width, height: depth.height, channels: 1 },
  })
    .resize({ width: 1024, withoutEnlargement: true })
    .blur(1.4)
    .png()
    .toBuffer();
  await sharp(buf).toFile(out);
  console.log("depth ok:", f, `${depth.width}x${depth.height}`);
}
console.log("done");
