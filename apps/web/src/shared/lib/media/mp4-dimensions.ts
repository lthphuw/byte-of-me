/**
 * The displayed size of an MP4's video track, read from its `tkhd` box.
 *
 * Only the box headers are walked, no decoder runs: the server already holds the
 * file's bytes, and a layout hint needs nothing more. A track's `tkhd` carries its
 * size as 16.16 fixed-point numbers, and a 90° or 270° rotation (a phone held upright)
 * is stored in the matrix, so the width and height are swapped to match what a
 * reader sees. Returns null for anything that is not a readable MP4 with a video
 * track; the caller then keeps the size the browser measures.
 */

export interface VideoDimensions {
  width: number;
  height: number;
}

/** Beyond this a size is a bad value, not a layout hint. */
const MAX_PX = 10_000;

interface Box {
  type: string;
  /** Offset of the first byte of the box's payload, after its header. */
  body: number;
  end: number;
}

function boxesIn(view: DataView, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;

  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );
    let header = 8;

    if (size === 1) {
      if (offset + 16 > end) break;
      size = Number(view.getBigUint64(offset + 8));
      header = 16;
    } else if (size === 0) {
      // "Runs to the end of the container."
      size = end - offset;
    }

    if (size < header || offset + size > end) break;
    boxes.push({ type, body: offset + header, end: offset + size });
    offset += size;
  }

  return boxes;
}

function readTrackSize(view: DataView, tkhd: Box): VideoDimensions | null {
  const version = view.getUint8(tkhd.body);
  // version + flags, then the times, track id, reserved and duration: the width and
  // height sit after the 36-byte matrix, and the matrix follows the 8 reserved bytes.
  const matrix = tkhd.body + 4 + (version === 1 ? 32 : 20) + 8 + 8;
  const sizeAt = matrix + 36;
  if (sizeAt + 8 > tkhd.end) return null;

  const rawWidth = view.getUint32(sizeAt) / 65536;
  const rawHeight = view.getUint32(sizeAt + 4) / 65536;
  if (!(rawWidth > 0 && rawHeight > 0)) return null; // an audio track has no picture

  // Matrix a and b: a rotation of 90° or 270° leaves a at zero and b at ±1.
  const a = view.getInt32(matrix);
  const b = view.getInt32(matrix + 4);
  const rotated = a === 0 && b !== 0;

  const width = Math.round(rotated ? rawHeight : rawWidth);
  const height = Math.round(rotated ? rawWidth : rawHeight);
  const fits = (px: number) => Number.isInteger(px) && px > 0 && px <= MAX_PX;
  return fits(width) && fits(height) ? { width, height } : null;
}

export function readMp4Dimensions(bytes: Uint8Array): VideoDimensions | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const moov = boxesIn(view, 0, view.byteLength).find(
      (box) => box.type === 'moov'
    );
    if (!moov) return null;

    for (const trak of boxesIn(view, moov.body, moov.end)) {
      if (trak.type !== 'trak') continue;
      const tkhd = boxesIn(view, trak.body, trak.end).find(
        (box) => box.type === 'tkhd'
      );
      const size = tkhd ? readTrackSize(view, tkhd) : null;
      if (size) return size;
    }
    return null;
  } catch {
    // A truncated or malformed file is no size, and must not fail an upload.
    return null;
  }
}
