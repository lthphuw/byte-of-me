/**
 * Rasterises the favicon set from its SVG sources.
 *
 *   bun run gen:icons
 *
 * The five SVGs under apps/web/public/icons are the source of truth; every PNG
 * and the .ico are generated from them and committed. Editing the mark means
 * editing an SVG and re-running this.
 *
 * The SVGs are authored in a 24-unit viewBox. librsvg renders at 72 DPI by
 * default, which would rasterise them at 24x24 and then upscale — blurry. So
 * the density is scaled to the target instead of resizing after the fact.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const ROOT = path.join(import.meta.dir, '..');
const PUBLIC_DIR = path.join(ROOT, 'apps/web/public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

const VIEWBOX = 24;
const BASE_DPI = 72;

async function rasterise(svgPath: string, size: number): Promise<Buffer> {
  const svg = await readFile(svgPath);
  return sharp(svg, { density: Math.ceil((BASE_DPI * size) / VIEWBOX) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function emit(svgPath: string, size: number, outPath: string): Promise<void> {
  await writeFile(outPath, await rasterise(svgPath, size));
  console.log(`  ${path.relative(ROOT, outPath)}  ${size}x${size}`);
}

const icons = (name: string) => path.join(ICONS_DIR, name);
const pub = (name: string) => path.join(PUBLIC_DIR, name);

console.log('Rasterising favicon set…');

// Per-context tab favicons. 16 and 32 are the two sizes browsers actually ask
// for; anything larger is served by the SVG.
for (const layer of ['public', 'cms', 'space'] as const) {
  for (const size of [16, 32]) {
    await emit(icons(`mark-${layer}.svg`), size, icons(`mark-${layer}-${size}.png`));
  }
}

await emit(icons('apple-touch.svg'), 180, pub('apple-touch-icon.png'));
await emit(icons('maskable.svg'), 192, pub('android-chrome-192x192.png'));
await emit(icons('maskable.svg'), 512, pub('android-chrome-512x512.png'));

// favicon.ico is the last-resort fallback and the file browsers request
// implicitly from the origin root, so it carries the public layer.
const icoSizes = [16, 32, 48];
const icoFrames = await Promise.all(
  icoSizes.map((size) => rasterise(icons('mark-public.svg'), size)),
);
await writeFile(pub('favicon.ico'), await pngToIco(icoFrames));
console.log(`  ${path.relative(ROOT, pub('favicon.ico'))}  ${icoSizes.join('/')}`);

console.log('Done.');
