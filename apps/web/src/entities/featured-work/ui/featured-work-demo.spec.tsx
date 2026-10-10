/**
 * The demo block as a visitor meets it: nothing fetched until the row has been
 * opened, a clip that plays only while it can be seen, and one button to stop it.
 * Renders the real component; only the browser's media and observer APIs are stubbed.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { FeaturedWorkDemo, type FeaturedWorkDemoItem } from './featured-work-demo';

const fp16: FeaturedWorkDemoItem = {
  id: 'm1',
  url: 'https://cdn.example.com/fp16.mp4',
  isVideo: true,
  caption: 'FP16',
  name: 'FP16',
  playLabel: 'Play FP16',
};
const int8: FeaturedWorkDemoItem = {
  id: 'm2',
  url: 'https://cdn.example.com/int8.gif',
  isVideo: false,
  caption: 'INT8',
  name: 'INT8',
  playLabel: 'Play INT8',
};

// --- browser stubs -------------------------------------------------------------

type Restore = () => void;
const restores: Restore[] = [];
/** What the stubbed media element was asked to do, in order. */
let calls: string[] = [];
const playing = new WeakSet<HTMLMediaElement>();

function stubMedia() {
  const proto = HTMLMediaElement.prototype;
  const original = {
    play: proto.play,
    pause: proto.pause,
    paused: Object.getOwnPropertyDescriptor(proto, 'paused'),
  };
  proto.play = function play(this: HTMLMediaElement) {
    calls.push('play');
    playing.add(this);
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  };
  proto.pause = function pause(this: HTMLMediaElement) {
    calls.push('pause');
    if (playing.delete(this)) this.dispatchEvent(new Event('pause'));
  };
  Object.defineProperty(proto, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return !playing.has(this);
    },
  });
  restores.push(() => {
    proto.play = original.play;
    proto.pause = original.pause;
    if (original.paused) Object.defineProperty(proto, 'paused', original.paused);
  });
}

/** Every observer the component created, so a test can report visibility itself. */
let observers: FakeObserver[] = [];
class FakeObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  report(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    });
  }
}

function stubObserver() {
  const original = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
  restores.push(() => {
    globalThis.IntersectionObserver = original;
  });
}

function stubReducedMotion(reduced: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  restores.push(() => {
    window.matchMedia = original;
  });
}

const visible = (isIntersecting = true) => observers.at(-1)?.report(isIntersecting);

beforeEach(() => {
  calls = [];
  observers = [];
  stubMedia();
  stubObserver();
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  while (restores.length) restores.pop()?.();
});

const clip = () => screen.getByRole('button', { name: 'Play FP16' });
const videoEl = () => {
  const video = document.querySelector('video');
  if (!video) throw new Error('no video mounted');
  return video;
};

// --- tests ---------------------------------------------------------------------

describe('FeaturedWorkDemo mounting', () => {
  it('fetches nothing while the row has never been opened', () => {
    const { container } = render(<FeaturedWorkDemo media={[fp16, int8]} open={false} />);

    expect(container.querySelector('video, img')).toBeNull();
    expect(container.querySelectorAll('figure')).toHaveLength(2);
  });

  it('mounts the media at the first opening and keeps it after the row closes', () => {
    const { container, rerender } = render(
      <FeaturedWorkDemo media={[fp16, int8]} open={false} />
    );

    rerender(<FeaturedWorkDemo media={[fp16, int8]} open />);
    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).not.toBeNull();

    rerender(<FeaturedWorkDemo media={[fp16, int8]} open={false} />);
    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('keeps the empty frames out of a print of a row that was never opened', () => {
    const { container, rerender } = render(<FeaturedWorkDemo media={[fp16]} open={false} />);
    expect(container.querySelector('figure')?.classList.contains('print:hidden')).toBe(true);

    rerender(<FeaturedWorkDemo media={[fp16]} open />);
    expect(container.querySelector('figure')?.classList.contains('print:hidden')).toBe(false);
  });

  it('mounts at once when it first renders inside an already open row', () => {
    const { container } = render(<FeaturedWorkDemo media={[fp16]} open />);

    expect(container.querySelector('video')).not.toBeNull();
  });
});

describe('FeaturedWorkDemo figures', () => {
  it('renders a pair as two figures, each captioned with its label', () => {
    const { container } = render(<FeaturedWorkDemo media={[fp16, int8]} open />);

    const figures = container.querySelectorAll('figure');
    expect(figures).toHaveLength(2);
    expect(figures[0]?.querySelector('figcaption')?.textContent).toBe('FP16');
    expect(figures[1]?.querySelector('figcaption')?.textContent).toBe('INT8');
  });

  it('renders a single item as one figure', () => {
    const { container } = render(<FeaturedWorkDemo media={[fp16]} open />);

    expect(container.querySelectorAll('figure')).toHaveLength(1);
  });

  it('draws no caption for an unlabelled item, and names the image after the work', () => {
    const unlabelled: FeaturedWorkDemoItem = {
      ...int8,
      caption: null,
      name: 'Faster detector export',
    };
    const { container } = render(<FeaturedWorkDemo media={[unlabelled]} open />);

    expect(container.querySelector('figcaption')).toBeNull();
    expect(screen.getByRole('img', { name: 'Faster detector export' })).toBeTruthy();
  });

  it('draws a GIF as a lazy, async <img> named by its label', () => {
    render(<FeaturedWorkDemo media={[int8]} open />);

    const image = screen.getByRole('img', { name: 'INT8' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe(int8.url);
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
  });
});

describe('FeaturedWorkDemo video', () => {
  it('is muted, looping, inline, metadata-only and not set to autoplay', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);

    const video = videoEl();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute('playsinline')).not.toBeNull();
    expect(video.getAttribute('preload')).toBe('metadata');
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('controls')).toBe(false);
    expect(video.getAttribute('src')?.startsWith(fp16.url)).toBe(true);
  });

  it('is controlled by one button named after its label, reporting whether it plays', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);

    expect(clip().getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('plays while the row is open and the clip is on screen', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);
    expect(calls).not.toContain('play');

    visible(true);

    expect(calls.at(-1)).toBe('play');
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('pauses when it scrolls out of view, and plays again when it returns', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);
    visible(true);

    visible(false);
    expect(calls.at(-1)).toBe('pause');
    expect(clip().getAttribute('aria-pressed')).toBe('false');

    visible(true);
    expect(calls.at(-1)).toBe('play');
  });

  it('pauses when the row collapses', () => {
    const { rerender } = render(<FeaturedWorkDemo media={[fp16]} open />);
    visible(true);
    expect(clip().getAttribute('aria-pressed')).toBe('true');

    rerender(<FeaturedWorkDemo media={[fp16]} open={false} />);

    expect(calls.at(-1)).toBe('pause');
    expect(clip().getAttribute('aria-pressed')).toBe('false');
  });

  it('does not play from sight alone while the row is shut', () => {
    const { rerender } = render(<FeaturedWorkDemo media={[fp16]} open />);
    rerender(<FeaturedWorkDemo media={[fp16]} open={false} />);
    calls = [];

    visible(true);

    expect(calls).not.toContain('play');
  });

  it('survives a refused play() without throwing, and still shows the play mark', () => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    render(<FeaturedWorkDemo media={[fp16]} open />);

    expect(() => visible(true)).not.toThrow();
    expect(clip().getAttribute('aria-pressed')).toBe('false');
    expect(clip().querySelector('svg')).not.toBeNull();
  });

  it('shows the play mark only while the clip is not moving', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);
    expect(clip().querySelector('svg')).not.toBeNull();

    visible(true);
    expect(clip().querySelector('svg')).toBeNull();

    fireEvent.click(clip());
    expect(clip().querySelector('svg')).not.toBeNull();
  });

  it('keeps the frame but drops the button when the clip fails to load', () => {
    const { container } = render(<FeaturedWorkDemo media={[fp16]} open />);

    act(() => {
      videoEl().dispatchEvent(new Event('error'));
    });

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('figure .aspect-video')).not.toBeNull();
  });
});

describe('FeaturedWorkDemo play/pause button', () => {
  it('pauses and resumes a playing clip on click', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);
    visible(true);

    fireEvent.click(clip());
    expect(clip().getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(clip());
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a clip the visitor paused paused when it scrolls back into view', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);
    visible(true);
    fireEvent.click(clip());

    visible(false);
    visible(true);

    expect(clip().getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles from the keyboard with Enter and with Space', async () => {
    const user = userEvent.setup();
    render(<FeaturedWorkDemo media={[fp16]} open />);
    visible(true);

    await user.tab();
    expect(document.activeElement).toBe(clip());

    await user.keyboard('{Enter}');
    expect(clip().getAttribute('aria-pressed')).toBe('false');

    await user.keyboard(' ');
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });
});

describe('FeaturedWorkDemo under reduced motion', () => {
  beforeEach(() => stubReducedMotion(true));

  it('does not autoplay when the clip is on screen', () => {
    render(<FeaturedWorkDemo media={[fp16]} open />);

    visible(true);

    expect(calls).not.toContain('play');
    expect(clip().getAttribute('aria-pressed')).toBe('false');
  });

  it('plays when the visitor presses the button, and stops when the row closes', () => {
    const { rerender } = render(<FeaturedWorkDemo media={[fp16]} open />);
    visible(true);

    fireEvent.click(clip());
    expect(clip().getAttribute('aria-pressed')).toBe('true');

    rerender(<FeaturedWorkDemo media={[fp16]} open={false} />);
    expect(clip().getAttribute('aria-pressed')).toBe('false');
  });
});
