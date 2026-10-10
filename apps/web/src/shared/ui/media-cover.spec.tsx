/**
 * The cover over a media box: it holds until the file draws, then clears in place.
 * Renders the real hook and cover; happy-dom stands in for the browser's image loader.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { MediaCover, useMediaDrawn } from './media-cover';

function Box({ src }: { src: string }) {
  const { ref, drawn } = useMediaDrawn<HTMLDivElement>();
  return (
    <div ref={ref}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
      <MediaCover drawn={drawn} />
    </div>
  );
}

/** A browser reports an image that is still downloading as not complete. */
const restores: Array<() => void> = [];
function stubPendingImages() {
  const proto = HTMLImageElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'complete');
  Object.defineProperty(proto, 'complete', {
    configurable: true,
    get: () => false,
  });
  restores.push(() => {
    if (original) Object.defineProperty(proto, 'complete', original);
    else Reflect.deleteProperty(proto, 'complete');
  });
}

afterEach(() => {
  cleanup();
  while (restores.length) restores.pop()?.();
});

const cover = (container: HTMLElement) => {
  const el = container.querySelector<HTMLElement>('span[aria-hidden="true"]');
  if (!el) throw new Error('no cover mounted');
  return el;
};
const isCleared = (container: HTMLElement) =>
  cover(container).classList.contains('opacity-0');

describe('useMediaDrawn', () => {
  it('is drawn at once for an image the browser already has', () => {
    const { container } = render(<Box src="/cached.png" />);

    expect(isCleared(container)).toBe(true);
  });

  it('holds the cover while the image is pending, then clears it on load', () => {
    stubPendingImages();
    const { container } = render(<Box src="/pending.png" />);
    expect(isCleared(container)).toBe(false);
    expect(
      cover(container).classList.contains('motion-safe:animate-pulse')
    ).toBe(true);

    act(() => {
      fireEvent.load(container.querySelector('img') as HTMLImageElement);
    });

    expect(isCleared(container)).toBe(true);
    expect(
      cover(container).classList.contains('motion-safe:animate-pulse')
    ).toBe(false);
  });

  it('clears the cover when the image fails, so a broken file never pulses forever', () => {
    stubPendingImages();
    const { container } = render(<Box src="/broken.png" />);

    act(() => {
      fireEvent.error(container.querySelector('img') as HTMLImageElement);
    });

    expect(isCleared(container)).toBe(true);
  });
});
