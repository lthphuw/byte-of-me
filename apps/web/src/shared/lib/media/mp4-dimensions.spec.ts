import { describe, expect, it } from 'bun:test';

import { readMp4Dimensions } from './mp4-dimensions';

const enc = new TextEncoder();

/** A box: size, four-character type, payload. */
function box(type: string, ...payload: Uint8Array[]): Uint8Array {
  const body = concat(payload);
  const out = new Uint8Array(8 + body.byteLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.byteLength);
  out.set(enc.encode(type), 4);
  out.set(body, 8);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

const u32 = (...values: number[]) => {
  const out = new Uint8Array(values.length * 4);
  const view = new DataView(out.buffer);
  values.forEach((value, i) => view.setUint32(i * 4, value));
  return out;
};

const i32 = (...values: number[]) => {
  const out = new Uint8Array(values.length * 4);
  const view = new DataView(out.buffer);
  values.forEach((value, i) => view.setInt32(i * 4, value));
  return out;
};

const ONE = 0x00010000; // 1.0 in 16.16
const px = (n: number) => n * 65536; // whole pixels in 16.16

/** A tkhd for version 0, with the given matrix a, b and display size. */
function tkhdV0(width: number, height: number, a = ONE, b = 0) {
  return box(
    'tkhd',
    u32(0), // version 0, flags 0
    u32(0, 0, 1, 0, 0), // creation, modification, track id, reserved, duration
    u32(0, 0), // reserved
    new Uint8Array(8), // layer, alternate group, volume, reserved
    i32(a, b, 0, 0, ONE, 0, 0, 0, 0x40000000), // matrix
    u32(px(width), px(height))
  );
}

function tkhdV1(width: number, height: number, a = ONE, b = 0) {
  return box(
    'tkhd',
    u32(0x01000000), // version 1, flags 0
    u32(0, 0, 0, 0), // creation and modification, 8 bytes each
    u32(1, 0, 0, 0), // track id, reserved, then the 8-byte duration
    u32(0, 0), // reserved
    new Uint8Array(8),
    i32(a, b, 0, 0, ONE, 0, 0, 0, 0x40000000),
    u32(px(width), px(height))
  );
}

const trak = (tkhd: Uint8Array) => box('trak', tkhd);
const moov = (...tracks: Uint8Array[]) => box('moov', ...tracks);
const ftyp = () => box('ftyp', enc.encode('isom'), u32(512));

describe('readMp4Dimensions', () => {
  it('reads the display size of the video track', () => {
    const file = concat([ftyp(), moov(trak(tkhdV0(1920, 1080)))]);

    expect(readMp4Dimensions(file)).toEqual({ width: 1920, height: 1080 });
  });

  it('reads a version 1 track header the same way', () => {
    const file = concat([ftyp(), moov(trak(tkhdV1(640, 360)))]);

    expect(readMp4Dimensions(file)).toEqual({ width: 640, height: 360 });
  });

  it('swaps the size of a clip rotated a quarter turn, as a phone held upright shoots it', () => {
    // Matrix a = 0, b = 1.0: rotated 90°, stored as landscape 1920x1080.
    const file = concat([ftyp(), moov(trak(tkhdV0(1920, 1080, 0, ONE)))]);

    expect(readMp4Dimensions(file)).toEqual({ width: 1080, height: 1920 });
  });

  it('skips an audio track, whose header has no picture, and reads the video after it', () => {
    const file = concat([
      ftyp(),
      moov(trak(tkhdV0(0, 0)), trak(tkhdV0(1280, 720))),
    ]);

    expect(readMp4Dimensions(file)).toEqual({ width: 1280, height: 720 });
  });

  it('gives no size for a file without a movie header', () => {
    expect(
      readMp4Dimensions(concat([ftyp(), box('mdat', new Uint8Array(16))]))
    ).toBeNull();
  });

  it('gives no size for a truncated file rather than throwing', () => {
    const whole = concat([ftyp(), moov(trak(tkhdV0(1920, 1080)))]);

    expect(readMp4Dimensions(whole.slice(0, whole.byteLength - 20))).toBeNull();
    expect(readMp4Dimensions(new Uint8Array([0, 0, 0, 3, 109]))).toBeNull();
  });
});
