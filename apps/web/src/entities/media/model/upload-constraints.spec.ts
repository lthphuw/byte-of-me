import { describe, expect, it } from 'bun:test';

import { mediaScopeSchema } from './media-schema';
import {
  detectImageMimeType,
  MEDIA_SCOPES,
  sanitizeStoredFileName,
} from './upload-constraints';

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part
    )
  );

const ftyp = (major: string, ...compatible: string[]) =>
  bytes(
    [0, 0, 0, 16 + compatible.length * 4],
    'ftyp',
    major,
    [0, 0, 0, 0],
    ...compatible
  );

describe('detectImageMimeType', () => {
  it('names each accepted raster format from its signature', () => {
    expect(detectImageMimeType(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe(
      'image/jpeg'
    );
    expect(
      detectImageMimeType(
        bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])
      )
    ).toBe('image/png');
    expect(detectImageMimeType(bytes('GIF89a', [1, 0, 1, 0]))).toBe(
      'image/gif'
    );
    expect(detectImageMimeType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe(
      'image/webp'
    );
    expect(detectImageMimeType(ftyp('avif', 'mif1'))).toBe('image/avif');
  });

  it('finds AVIF when it is only a compatible brand', () => {
    expect(detectImageMimeType(ftyp('mif1', 'miaf', 'avif'))).toBe(
      'image/avif'
    );
  });

  it('does not take other ISO-BMFF files for AVIF', () => {
    expect(detectImageMimeType(ftyp('isom', 'mp42'))).toBeNull();
  });

  it('recognises SVG with or without a prolog, comments and doctype', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

    expect(detectImageMimeType(bytes(svg))).toBe('image/svg+xml');
    expect(
      detectImageMimeType(
        bytes(
          `\n<?xml version="1.0"?>\n<!-- made by hand -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd">\n${svg}`
        )
      )
    ).toBe('image/svg+xml');
  });

  it('refuses content that only claims to be an image', () => {
    expect(
      detectImageMimeType(bytes('<html><script>alert(1)</script></html>'))
    ).toBeNull();
    expect(
      detectImageMimeType(bytes('<!-- <svg> --><html></html>'))
    ).toBeNull();
    expect(detectImageMimeType(bytes('MZ\u0090\u0000'))).toBeNull();
    expect(detectImageMimeType(new Uint8Array())).toBeNull();
  });

  it('answers quickly on a long run of comments with no element', () => {
    const hostile = '<!--a-->'.repeat(250);

    const started = performance.now();
    expect(detectImageMimeType(bytes(hostile))).toBeNull();
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe('sanitizeStoredFileName', () => {
  it('keeps an ordinary name as it is', () => {
    expect(sanitizeStoredFileName('Holiday photo (2).png')).toBe(
      'Holiday photo (2).png'
    );
  });

  it('removes path separators and control characters', () => {
    const cleaned = sanitizeStoredFileName('..\\..//etc/pass\u0000wd\n.png');

    expect(cleaned).not.toMatch(/[\\/]/);
    expect([...cleaned].every((c) => (c.codePointAt(0) ?? 0) >= 0x20)).toBe(
      true
    );
    expect(cleaned.endsWith('.png')).toBe(true);
  });

  it('caps the length and keeps the extension', () => {
    const cleaned = sanitizeStoredFileName(`${'a'.repeat(500)}.webp`);

    expect(cleaned).toHaveLength(120);
    expect(cleaned.endsWith('.webp')).toBe(true);
  });

  it('never returns an empty name', () => {
    expect(sanitizeStoredFileName('   ')).toBe('image');
  });
});

describe('mediaScopeSchema', () => {
  it.each([...MEDIA_SCOPES])('accepts %s', (scope) => {
    expect(mediaScopeSchema.safeParse(scope).success).toBe(true);
  });

  it.each(['../../other-user', 'blog/../x', '', 'BLOG', 'secrets'])(
    'rejects %p',
    (scope) => {
      expect(mediaScopeSchema.safeParse(scope).success).toBe(false);
    }
  );
});
