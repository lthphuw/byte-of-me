import { describe, expect, test } from 'bun:test';

import { compressImage } from './compress-image';
import { IMAGE_COMPRESSION_DEFAULTS } from './image-compression-config';

// A real, tiny SVG — this is a vector, and `sharp` would rasterise it if
// `compressImage` ran it through the normal pipeline, which is exactly the
// bug `shouldSkipCompression` exists to prevent.
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'
);

// A real, tiny (1x1) GIF — re-encoding through `sharp`'s default single-frame
// read would be indistinguishable from an intentional re-encode for a
// STATIC gif like this one, which is why the assertion below is on the
// bytes, not just on whether it "looks like a gif" afterwards.
const GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64'
);

describe('compressImage — SVG and GIF pass through untouched', () => {
  test('returns the SVG buffer and mime type unchanged', async () => {
    const result = await compressImage(SVG, 'image/svg+xml', IMAGE_COMPRESSION_DEFAULTS);

    expect(result.buffer.equals(SVG)).toBe(true);
    expect(result.mimeType).toBe('image/svg+xml');
  });

  test('returns the GIF buffer and mime type unchanged', async () => {
    const result = await compressImage(GIF, 'image/gif', IMAGE_COMPRESSION_DEFAULTS);

    expect(result.buffer.equals(GIF)).toBe(true);
    expect(result.mimeType).toBe('image/gif');
  });

  test('a disabled config passes a compressible format through untouched too', async () => {
    // Not SVG/GIF this time — the `enabled: false` branch is the one under
    // test, so a JPEG-shaped buffer would still hit `compressImage`'s normal
    // pipeline if that flag were ignored.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // minimal (invalid-as-image) JPEG marker bytes
    const result = await compressImage(jpeg, 'image/jpeg', {
      ...IMAGE_COMPRESSION_DEFAULTS,
      enabled: false,
    });

    expect(result.buffer.equals(jpeg)).toBe(true);
    expect(result.mimeType).toBe('image/jpeg');
  });
});
