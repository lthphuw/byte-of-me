import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildIconSet, type IconLayer } from './metadata';

const LAYERS: IconLayer[] = ['public', 'cms', 'space'];

/**
 * These tests exist because of a measured Next.js behaviour, not a hypothetical
 * one: a nested layout's `icons` replaces the parent's outright. Adding
 * `icons: { icon: '…' }` to a nested layout on Next 16.2.3 dropped the root's
 * `shortcut` and `apple-touch-icon` links entirely. A layer that forgets one
 * entry ships a page with that icon missing, and nothing fails loudly.
 */
describe('buildIconSet', () => {
  it('gives every layer the full set, so no override can drop an entry', () => {
    for (const layer of LAYERS) {
      const set = buildIconSet(layer);
      expect(set).toMatchObject({
        shortcut: expect.any(String),
        apple: expect.any(String),
      });
      expect(Array.isArray((set as { icon: unknown }).icon)).toBe(true);
    }
  });

  it('lists SVG before PNG, because only SVG can invert on a dark tab strip', () => {
    for (const layer of LAYERS) {
      const icon = (buildIconSet(layer) as { icon: { type?: string }[] }).icon;
      expect(icon[0]?.type).toBe('image/svg+xml');
      expect(icon.slice(1).every((entry) => entry.type === 'image/png')).toBe(true);
    }
  });

  it('points each layer at its own assets', () => {
    for (const layer of LAYERS) {
      const icon = (buildIconSet(layer) as { icon: { url: string }[] }).icon;
      expect(icon.map((entry) => entry.url)).toEqual([
        `/icons/mark-${layer}.svg`,
        `/icons/mark-${layer}-32.png`,
        `/icons/mark-${layer}-16.png`,
      ]);
    }
  });

  it('shares one apple-touch icon across layers — the home screen is not per-space', () => {
    const apples = LAYERS.map((layer) => (buildIconSet(layer) as { apple: string }).apple);
    expect(new Set(apples).size).toBe(1);
  });

  it('references files that exist — the rasters are generated, not hand-written', () => {
    const publicDir = path.join(import.meta.dir, '../../../public');
    const missing: string[] = [];

    for (const layer of LAYERS) {
      const set = buildIconSet(layer) as {
        icon: { url: string }[];
        shortcut: string;
        apple: string;
      };
      for (const url of [...set.icon.map((e) => e.url), set.shortcut, set.apple]) {
        if (!existsSync(path.join(publicDir, url))) missing.push(url);
      }
    }

    // If this fails after editing an SVG, the fix is `bun run gen:icons`.
    expect(missing).toEqual([]);
  });

  it('has rasters generated from the current SVGs, not a stale run', () => {
    // The generation step is manual (`bun run gen:icons`) and nothing in the
    // build enforces it, so editing an SVG and forgetting to re-run it would
    // otherwise ship stale PNGs with every file still present and no failure.
    // Digests, not re-rasterised bytes: sharp's PNG output is not guaranteed
    // identical across platforms, a sha256 of the source is.
    const iconsDir = path.join(import.meta.dir, '../../../public/icons');
    const lockPath = path.join(import.meta.dir, '../../../../../scripts/icons.lock.json');
    const locked = JSON.parse(readFileSync(lockPath, 'utf8')) as Record<string, string>;

    const stale = Object.entries(locked)
      .filter(([name, digest]) => {
        const actual = createHash('sha256')
          .update(readFileSync(path.join(iconsDir, name)))
          .digest('hex');
        return actual !== digest;
      })
      .map(([name]) => name);

    expect(stale).toEqual([]);
  });

  it('gives the three layers distinct tab favicons', () => {
    const svgs = LAYERS.map(
      (layer) => (buildIconSet(layer) as { icon: { url: string }[] }).icon[0]!.url,
    );
    expect(new Set(svgs).size).toBe(LAYERS.length);
  });
});
