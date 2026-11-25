// Genera los iconos PNG de la PWA a partir del SVG de la marca.
// Uso: node scripts/make-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const svg = join(here, "..", "public", "favicon.svg");
const out = join(here, "..", "public", "icons");

const sizes = [
  { name: "icon-192.png", size: 192, padding: 0 },
  { name: "icon-512.png", size: 512, padding: 0 },
  { name: "icon-512-maskable.png", size: 512, padding: 64 }
];

for (const { name, size, padding } of sizes) {
  const inner = await sharp(svg).resize(size - padding * 2).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 16, g: 49, b: 79, alpha: 1 }
    }
  })
    .composite([{ input: inner, gravity: "centre" }])
    .png()
    .toFile(join(out, name));
  console.log("OK", name);
}
