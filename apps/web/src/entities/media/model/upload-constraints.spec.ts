import { describe, expect, it } from 'bun:test';

import { mediaScopeSchema } from './media-schema';
import {
  detectImageMimeType,
  detectMediaMimeType,
  detectVideoMimeType,
  findUploadViolation,
  MAX_IMAGE_SIZE_BYTES,
  MAX_UPLOAD_BATCH,
  MAX_UPLOAD_TOTAL_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MEDIA_SCOPES,
  resolveUploadedMimeType,
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

/** An EBML header whose DocType reads `docType`, followed by a Segment id. */
const webm = (docType = 'webm') => {
  const children = [
    ...[0x42, 0x86, 0x81, 0x01], // EBMLVersion
    ...[0x42, 0xf7, 0x81, 0x01], // EBMLReadVersion
    ...[
      0x42,
      0x82,
      0x80 | docType.length,
      ...[...docType].map((c) => c.charCodeAt(0)),
    ],
    ...[0x42, 0x87, 0x81, 0x04], // DocTypeVersion
  ];
  return bytes(
    [0x1a, 0x45, 0xdf, 0xa3, 0x80 | children.length, ...children],
    [0x18, 0x53, 0x80, 0x67]
  );
};

describe('detectVideoMimeType', () => {
  it.each(['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '])(
    'names an MP4 whose major brand is %p',
    (brand) => {
      expect(detectVideoMimeType(ftyp(brand, 'isom', 'mp42'))).toBe(
        'video/mp4'
      );
      expect(detectMediaMimeType(ftyp(brand, 'isom', 'mp42'))).toBe(
        'video/mp4'
      );
    }
  );

  it('names a WebM from its EBML header and DocType', () => {
    expect(detectVideoMimeType(webm())).toBe('video/webm');
    expect(detectMediaMimeType(webm())).toBe('video/webm');
  });

  it('refuses Matroska, which shares the EBML magic but is not WebM', () => {
    expect(detectVideoMimeType(webm('matroska'))).toBeNull();
  });

  it('refuses ISO-BMFF files that are not MP4 video', () => {
    expect(detectVideoMimeType(ftyp('qt  ', 'qt  '))).toBeNull();
    expect(detectVideoMimeType(ftyp('heic', 'mif1'))).toBeNull();
    // Still an image: the AVIF path is untouched.
    expect(detectMediaMimeType(ftyp('avif', 'mif1'))).toBe('image/avif');
  });

  it('refuses a truncated header', () => {
    const mp4 = ftyp('isom', 'isom', 'mp42');
    expect(detectVideoMimeType(mp4.subarray(0, 12))).toBeNull();
    expect(detectVideoMimeType(mp4.subarray(0, 20))).toBeNull();
    const clip = webm();
    expect(detectVideoMimeType(clip.subarray(0, 4))).toBeNull();
    expect(detectVideoMimeType(clip.subarray(0, 10))).toBeNull();
    expect(detectVideoMimeType(new Uint8Array())).toBeNull();
  });

  it('refuses an ftyp whose declared size is hostile or misaligned', () => {
    expect(
      detectVideoMimeType(bytes([0, 0, 0, 0], 'ftypisom', [0, 0, 0, 0]))
    ).toBeNull();
    expect(
      detectVideoMimeType(bytes([0, 0, 0, 1], 'ftypisom', [0, 0, 0, 0]))
    ).toBeNull();
    expect(
      detectVideoMimeType(
        bytes([0xff, 0xff, 0xff, 0xff], 'ftypisom', [0, 0, 0, 0])
      )
    ).toBeNull();
    expect(
      detectVideoMimeType(
        bytes([0, 0, 0, 18], 'ftypisom', [0, 0, 0, 0], [0, 0])
      )
    ).toBeNull();
  });

  it('refuses an EBML header whose size lies', () => {
    expect(
      detectVideoMimeType(bytes([0x1a, 0x45, 0xdf, 0xa3, 0xff, 0x42, 0x82]))
    ).toBeNull();
    expect(
      detectVideoMimeType(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0, 0]))
    ).toBeNull();
  });

  it('refuses a PNG, HTML and SVG, whatever they are named', () => {
    const png = bytes([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    const html = bytes('<html><script>alert(1)</script></html>');
    const svg = bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    for (const content of [png, html, svg]) {
      expect(detectVideoMimeType(content)).toBeNull();
      expect(resolveUploadedMimeType('video/mp4', content)).toBeNull();
      expect(resolveUploadedMimeType('video/webm', content)).toBeNull();
    }
  });
});

describe('resolveUploadedMimeType', () => {
  it('accepts a video that matches its declaration', () => {
    expect(resolveUploadedMimeType('video/mp4', ftyp('isom', 'mp42'))).toBe(
      'video/mp4'
    );
    expect(resolveUploadedMimeType('video/webm', webm())).toBe('video/webm');
  });

  it('refuses a mismatch in either direction, between videos and with images', () => {
    expect(
      resolveUploadedMimeType('video/webm', ftyp('isom', 'mp42'))
    ).toBeNull();
    expect(resolveUploadedMimeType('video/mp4', webm())).toBeNull();
    expect(
      resolveUploadedMimeType('image/png', ftyp('isom', 'mp42'))
    ).toBeNull();
    expect(resolveUploadedMimeType('image/gif', webm())).toBeNull();
    expect(
      resolveUploadedMimeType('video/mp4', bytes('GIF89a', [1, 0, 1, 0]))
    ).toBeNull();
  });

  it('still stores an image as what its bytes are, and keeps GIF an image', () => {
    const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
    expect(resolveUploadedMimeType('image/jpeg', png)).toBe('image/png');
    expect(
      resolveUploadedMimeType('image/gif', bytes('GIF89a', [1, 0, 1, 0]))
    ).toBe('image/gif');
  });
});

const sized = (size: number, type: string, name = 'f') => {
  const file = new File([], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('findUploadViolation', () => {
  it('accepts an mp4, a webm, a GIF and a png at their caps', () => {
    expect(
      findUploadViolation([sized(MAX_VIDEO_SIZE_BYTES, 'video/mp4')])
    ).toBeNull();
    expect(
      findUploadViolation([sized(MAX_VIDEO_SIZE_BYTES, 'video/webm')])
    ).toBeNull();
    expect(
      findUploadViolation([sized(MAX_IMAGE_SIZE_BYTES, 'image/gif')])
    ).toBeNull();
    expect(
      findUploadViolation([sized(MAX_IMAGE_SIZE_BYTES, 'image/png')])
    ).toBeNull();
  });

  it('rejects a video over 10 MB and an image over 3 MB, each with its own limit', () => {
    expect(
      findUploadViolation([
        sized(MAX_VIDEO_SIZE_BYTES + 1, 'video/mp4', 'a.mp4'),
      ])
    ).toEqual({
      kind: 'size',
      fileName: 'a.mp4',
      maxSizeMb: 10,
    });
    expect(
      findUploadViolation([
        sized(MAX_IMAGE_SIZE_BYTES + 1, 'image/png', 'a.png'),
      ])
    ).toEqual({
      kind: 'size',
      fileName: 'a.png',
      maxSizeMb: 3,
    });
    // A video's higher cap does not leak onto images.
    expect(
      findUploadViolation([sized(MAX_IMAGE_SIZE_BYTES + 1, 'image/gif')])?.kind
    ).toBe('size');
  });

  it('rejects other video types and unknown declarations', () => {
    expect(
      findUploadViolation([sized(10, 'video/quicktime', 'a.mov')])?.kind
    ).toBe('type');
    expect(findUploadViolation([sized(10, 'video/x-matroska')])?.kind).toBe(
      'type'
    );
    expect(findUploadViolation([sized(10, '')])?.kind).toBe('type');
    expect(findUploadViolation([sized(10, 'text/html')])?.kind).toBe('type');
  });

  it('keeps the batch rule at five files', () => {
    const files = Array.from({ length: MAX_UPLOAD_BATCH + 1 }, () =>
      sized(10, 'image/png')
    );
    expect(findUploadViolation(files)).toEqual({
      kind: 'batch',
      max: MAX_UPLOAD_BATCH,
    });
    expect(findUploadViolation(files.slice(0, MAX_UPLOAD_BATCH))).toBeNull();
  });

  it('keeps five full-size images allowed but refuses a batch over the request total', () => {
    const fiveImages = Array.from({ length: 5 }, () =>
      sized(MAX_IMAGE_SIZE_BYTES, 'image/png')
    );
    expect(findUploadViolation(fiveImages)).toBeNull();

    const twoClips = [
      sized(MAX_VIDEO_SIZE_BYTES, 'video/mp4'),
      sized(MAX_VIDEO_SIZE_BYTES, 'video/webm'),
    ];
    expect(MAX_UPLOAD_TOTAL_BYTES).toBeLessThan(20 * 1024 * 1024);
    expect(findUploadViolation(twoClips)).toEqual({
      kind: 'total',
      maxSizeMb: 16,
    });
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
  it('has a featured-work scope for the demo clips', () => {
    expect(mediaScopeSchema.safeParse('featured-work').success).toBe(true);
  });

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
