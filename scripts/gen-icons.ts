/**
 * Builds the icon set from `apps/web/src/shared/lib/brand-mark.ts`: `bun run gen:icons`.
 * Relative import: the isolated node_modules layout resolves `@byte-of-me/*` only in apps/web.
 * librsvg rasterises the 24-unit SVGs at 72 DPI (blurry upscale), so density is scaled to size.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

import {
  BRAND_LAYERS,
  FAVICON_FILES,
  MARK_VIEWBOX,
  renderFaviconSvg,
} from '../apps/web/src/shared/lib/brand-mark';

const ROOT = path.join(import.meta.dir, '..');
const PUBLIC_DIR = path.join(ROOT, 'apps/web/public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

/**
 * sha256 of every generated SVG, asserted by `icon-set.spec.ts`: catches SVGs regenerated
 * with rasters left behind. Digests, not re-rasterising: sharp's PNG bytes differ across
 * platforms and versions. Beside the generator, not in public/, so it is not served.
 */
const LOCKFILE = path.join(ROOT, 'scripts/icons.lock.json');

const BASE_DPI = 72;

const log = (line: string) => process.stdout.write(`${line}\n`);

async function rasterise(svgPath: string, size: number): Promise<Buffer> {
  const svg = await readFile(svgPath);
  return sharp(svg, { density: Math.ceil((BASE_DPI * size) / MARK_VIEWBOX) })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function emit(
  svgPath: string,
  size: number,
  outPath: string
): Promise<void> {
  await writeFile(outPath, await rasterise(svgPath, size));
  log(`  ${path.relative(ROOT, outPath)}  ${size}x${size}`);
}

const icons = (name: string) => path.join(ICONS_DIR, name);
const pub = (name: string) => path.join(PUBLIC_DIR, name);

log('Writing SVG sources…');
for (const file of FAVICON_FILES) {
  await writeFile(icons(file), renderFaviconSvg(file));
  log(`  ${path.relative(ROOT, icons(file))}`);
}

log('Rasterising…');

// Per-context tab favicons. 16 and 32 are the two sizes browsers actually ask
// for; anything larger is served by the SVG.
for (const layer of BRAND_LAYERS) {
  for (const size of [16, 32]) {
    await emit(
      icons(`mark-${layer}.svg`),
      size,
      icons(`mark-${layer}-${size}.png`)
    );
  }
}

await emit(icons('apple-touch.svg'), 180, pub('apple-touch-icon.png'));
await emit(icons('maskable.svg'), 192, pub('android-chrome-192x192.png'));
await emit(icons('maskable.svg'), 512, pub('android-chrome-512x512.png'));

// favicon.ico is the last-resort fallback and the file browsers request
// implicitly from the origin root, so it carries the public layer.
const icoSizes = [16, 32, 48];
const icoFrames = await Promise.all(
  icoSizes.map((size) => rasterise(icons('mark-public.svg'), size))
);
await writeFile(pub('favicon.ico'), await pngToIco(icoFrames));
log(`  ${path.relative(ROOT, pub('favicon.ico'))}  ${icoSizes.join('/')}`);

const digests: Record<string, string> = {};
for (const name of FAVICON_FILES) {
  digests[name] = createHash('sha256')
    .update(renderFaviconSvg(name))
    .digest('hex');
}
await writeFile(LOCKFILE, `${JSON.stringify(digests, null, 2)}\n`);
log(`  ${path.relative(ROOT, LOCKFILE)}  ${FAVICON_FILES.length} sources`);

log('Done.');
