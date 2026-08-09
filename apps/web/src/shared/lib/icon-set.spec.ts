import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  BRAND_LAYERS,
  FAVICON_FILES,
  renderFaviconSvg,
} from './brand-mark';
import { buildIconSet } from './metadata';

const ICONS_DIR = path.join(import.meta.dir, '../../../public/icons');

/**
 * These tests exist because of a measured Next.js behaviour, not a hypothetical
 * one: a nested layout's `icons` replaces the parent's outright. Adding
 * `icons: { icon: '…' }` to a nested layout on Next 16.2.3 dropped the root's
 * `shortcut` and `apple-touch-icon` links entirely. A layer that forgets one
 * entry ships a page with that icon missing, and nothing fails loudly.
 */
describe('buildIconSet', () => {
  it('gives every layer the full set, so no override can drop an entry', () => {
    for (const layer of BRAND_LAYERS) {
      const set = buildIconSet(layer);
      expect(set).toMatchObject({
        shortcut: expect.any(String),
        apple: expect.any(String),
      });
      expect(Array.isArray((set as { icon: unknown }).icon)).toBe(true);
    }
  });

  it('lists SVG before PNG, because only SVG can invert on a dark tab strip', () => {
    for (const layer of BRAND_LAYERS) {
      const icon = (buildIconSet(layer) as { icon: { type?: string }[] }).icon;
      expect(icon[0]?.type).toBe('image/svg+xml');
      expect(icon.slice(1).every((entry) => entry.type === 'image/png')).toBe(true);
    }
  });

  it('points each layer at its own assets', () => {
    for (const layer of BRAND_LAYERS) {
      const icon = (buildIconSet(layer) as { icon: { url: string }[] }).icon;
      expect(icon.map((entry) => entry.url)).toEqual([
        `/icons/mark-${layer}.svg`,
        `/icons/mark-${layer}-32.png`,
        `/icons/mark-${layer}-16.png`,
      ]);
    }
  });

  it('shares one apple-touch icon across layers — the home screen is not per-space', () => {
    const apples = BRAND_LAYERS.map(
      (layer) => (buildIconSet(layer) as { apple: string }).apple,
    );
    expect(new Set(apples).size).toBe(1);
  });

  it('references files that exist — the rasters are generated, not hand-written', () => {
    const publicDir = path.join(import.meta.dir, '../../../public');
    const missing: string[] = [];

    for (const layer of BRAND_LAYERS) {
      const set = buildIconSet(layer) as {
        icon: { url: string }[];
        shortcut: string;
        apple: string;
      };
      for (const url of [...set.icon.map((e) => e.url), set.shortcut, set.apple]) {
        if (!existsSync(path.join(publicDir, url))) missing.push(url);
      }
    }

    // If this fails after editing the mark, the fix is `bun run gen:icons`.
    expect(missing).toEqual([]);
  });

  it('gives the three layers distinct tab favicons', () => {
    const svgs = BRAND_LAYERS.map(
      (layer) => (buildIconSet(layer) as { icon: { url: string }[] }).icon[0]!.url,
    );
    expect(new Set(svgs).size).toBe(BRAND_LAYERS.length);
  });
});

/**
 * The generation step is manual (`bun run gen:icons`) and nothing in the build
 * enforces it, so editing the mark and forgetting to re-run it would otherwise
 * ship stale assets with every file still present and no failure. These two
 * tests cover the two halves of that gap.
 */
describe('generated icon assets', () => {
  it('match what brand-mark.ts currently describes', () => {
    const drifted = FAVICON_FILES.filter(
      (file) =>
        readFileSync(path.join(ICONS_DIR, file), 'utf8') !== renderFaviconSvg(file),
    );

    expect(drifted).toEqual([]);
  });

  it('have rasters built from those SVGs, not an earlier run', () => {
    // Digests, not re-rasterised bytes: sharp's PNG output is not guaranteed
    // identical across platforms or versions, a sha256 of the source is. The
    // lockfile is written by the same run that writes the PNGs, so a match
    // proves the two came from the same source text.
    const lockPath = path.join(import.meta.dir, '../../../../../scripts/icons.lock.json');
    const locked = JSON.parse(readFileSync(lockPath, 'utf8')) as Record<string, string>;

    expect(Object.keys(locked).sort()).toEqual([...FAVICON_FILES].sort());

    const stale = Object.entries(locked)
      .filter(([name, digest]) => {
        const actual = createHash('sha256')
          .update(readFileSync(path.join(ICONS_DIR, name)))
          .digest('hex');
        return actual !== digest;
      })
      .map(([name]) => name);

    expect(stale).toEqual([]);
  });
});
