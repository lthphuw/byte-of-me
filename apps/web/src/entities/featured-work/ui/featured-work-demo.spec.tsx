/**
 * The demo block as a visitor meets it: always on show, a clip that plays only while
 * it can be seen, one button to stop it and one to take it full screen.
 * Renders the real component; only the browser's media and observer APIs are stubbed.
 */
import {
  act,
  cleanup,
  fireEvent,
  render as plainRender,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../messages/en.json';

import {
  FeaturedWorkDemo,
  type FeaturedWorkDemoControlLabels,
  type FeaturedWorkDemoItem,
} from './featured-work-demo';

// The carousel names its arrows from `components.mediaCarousel`.
const render = (ui: React.ReactElement) =>
  plainRender(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );

const fp16: FeaturedWorkDemoItem = {
  id: 'm1',
  url: 'https://cdn.example.com/fp16.mp4',
  isVideo: true,
  caption: 'FP16',
  name: 'FP16',
  playLabel: 'Play FP16',
  fullscreenLabel: 'Full screen FP16',
};
const int8: FeaturedWorkDemoItem = {
  id: 'm2',
  url: 'https://cdn.example.com/int8.gif',
  isVideo: false,
  caption: 'INT8',
  name: 'INT8',
  playLabel: 'Play INT8',
  fullscreenLabel: 'Full screen INT8',
};

const controlLabels: FeaturedWorkDemoControlLabels = {
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomReset: 'Reset zoom',
  exitFullscreen: 'Exit full screen',
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
    if (original.paused)
      Object.defineProperty(proto, 'paused', original.paused);
  });
}

/** Every observer the component created, so a test can report visibility itself. */
let observers: FakeObserver[] = [];
class FakeObserver {
  /** What this observer watches, so a test can tell the clip's two observers apart. */
  target: Element | null = null;
  constructor(private readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
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
  globalThis.IntersectionObserver =
    FakeObserver as unknown as typeof IntersectionObserver;
  restores.push(() => {
    globalThis.IntersectionObserver = original;
  });
}

/** happy-dom reports an image as complete at once; a browser does not until it has drawn it. */
function stubImageComplete() {
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

/**
 * The play observer watches the button; the lazy-load observer watches the clip's wrapper. The
 * carousel's own observers (one per slide, a `group`) share the stub, so they are left out.
 */
const latest = (tag: string) =>
  observers
    .filter(
      (o) =>
        o.target?.tagName === tag && o.target.getAttribute('role') !== 'group'
    )
    .at(-1);
const visible = (isIntersecting = true) =>
  latest('BUTTON')?.report(isIntersecting);
const nearClip = (isIntersecting = true) =>
  latest('DIV')?.report(isIntersecting);

beforeEach(() => {
  calls = [];
  observers = [];
  stubMedia();
  stubObserver();
  stubImageComplete();
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  while (restores.length) restores.pop()?.();
});

const clip = () => screen.getByRole('button', { name: 'Play FP16' });
/** The cover over a media frame, the one aria-hidden span inside a figure. */
const placeholder = () => {
  const cover = document.querySelector<HTMLElement>(
    'figure span[aria-hidden="true"]'
  );
  if (!cover) throw new Error('no placeholder mounted');
  return cover;
};
const videoEl = () => {
  const video = document.querySelector('video');
  if (!video) throw new Error('no video mounted');
  return video;
};

// --- tests ---------------------------------------------------------------------

describe('FeaturedWorkDemo mounting', () => {
  it('draws the media at once, with no row to open', () => {
    const { container } = render(
      <FeaturedWorkDemo media={[fp16, int8]} controlLabels={controlLabels} />
    );

    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelectorAll('figure')).toHaveLength(2);
  });
});

describe('FeaturedWorkDemo figures', () => {
  it('renders a pair as two figures, each captioned with its label', () => {
    const { container } = render(
      <FeaturedWorkDemo media={[fp16, int8]} controlLabels={controlLabels} />
    );

    const figures = container.querySelectorAll('figure');
    expect(figures).toHaveLength(2);
    expect(figures[0]?.querySelector('figcaption')?.textContent).toBe('FP16');
    expect(figures[1]?.querySelector('figcaption')?.textContent).toBe('INT8');
  });

  it('renders a single item as one figure', () => {
    const { container } = render(
      <FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />
    );

    expect(container.querySelectorAll('figure')).toHaveLength(1);
  });

  it('draws no caption for an unlabelled item, and names the image after the work', () => {
    const unlabelled: FeaturedWorkDemoItem = {
      ...int8,
      caption: null,
      name: 'Faster detector export',
    };
    const { container } = render(
      <FeaturedWorkDemo media={[unlabelled]} controlLabels={controlLabels} />
    );

    expect(container.querySelector('figcaption')).toBeNull();
    expect(
      screen.getByRole('img', { name: 'Faster detector export' })
    ).toBeTruthy();
  });

  it('draws a GIF as a lazy, async <img> named by its label', () => {
    render(<FeaturedWorkDemo media={[int8]} controlLabels={controlLabels} />);

    const image = screen.getByRole('img', { name: 'INT8' });
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe(int8.url);
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
  });
});

describe('FeaturedWorkDemo video', () => {
  it('is muted, looping, inline and not set to autoplay', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    const video = videoEl();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute('playsinline')).not.toBeNull();
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('controls')).toBe(false);
  });

  it('requests no file until the clip nears the screen', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    const video = videoEl();
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.hasAttribute('src')).toBe(false);

    nearClip(true);

    expect(video.getAttribute('preload')).toBe('metadata');
    expect(video.getAttribute('src')?.startsWith(fp16.url)).toBe(true);
  });

  it('keeps the file it has requested when the clip scrolls back out of reach', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    nearClip(true);

    nearClip(false);

    expect(videoEl().getAttribute('src')?.startsWith(fp16.url)).toBe(true);
  });

  it('is controlled by one button named after its label, reporting whether it plays', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    expect(clip().getAttribute('aria-pressed')).toBe('false');
    expect(
      screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    ).toEqual(['Play FP16', 'Full screen FP16']);
  });

  it('plays while the clip is on screen', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    expect(calls).not.toContain('play');

    visible(true);

    expect(calls.at(-1)).toBe('play');
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('pauses when it scrolls out of view, and plays again when it returns', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);

    visible(false);
    expect(calls.at(-1)).toBe('pause');
    expect(clip().getAttribute('aria-pressed')).toBe('false');

    visible(true);
    expect(calls.at(-1)).toBe('play');
  });

  it('survives a refused play() without throwing, and still shows the play mark', () => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    expect(() => visible(true)).not.toThrow();
    expect(clip().getAttribute('aria-pressed')).toBe('false');
    expect(clip().querySelector('svg')).not.toBeNull();
  });

  it('shows the play mark only while the clip is not moving', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    expect(clip().querySelector('svg')).not.toBeNull();

    visible(true);
    expect(clip().querySelector('svg')).toBeNull();

    fireEvent.click(clip());
    expect(clip().querySelector('svg')).not.toBeNull();
  });

  it('keeps the frame but drops the button when the clip fails to load', () => {
    const { container } = render(
      <FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />
    );

    act(() => {
      videoEl().dispatchEvent(new Event('error'));
    });

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('figure .aspect-video')).not.toBeNull();
  });
});

describe('FeaturedWorkDemo placeholder', () => {
  it('covers a clip until its file has drawn, then fades the cover out', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    expect(placeholder().classList.contains('opacity-0')).toBe(false);
    expect(placeholder().classList.contains('motion-safe:animate-pulse')).toBe(
      true
    );

    act(() => {
      videoEl().dispatchEvent(new Event('loadeddata'));
    });

    expect(placeholder().classList.contains('opacity-0')).toBe(true);
    // A running pulse overrides `opacity-0`, so it must be gone for the cover to clear.
    expect(placeholder().classList.contains('motion-safe:animate-pulse')).toBe(
      false
    );
  });

  it('fades an image cover out once the image has loaded', () => {
    render(<FeaturedWorkDemo media={[int8]} controlLabels={controlLabels} />);
    expect(placeholder().classList.contains('opacity-0')).toBe(false);

    fireEvent.load(screen.getByRole('img', { name: 'INT8' }));

    expect(placeholder().classList.contains('opacity-0')).toBe(true);
  });

  it('lifts an image cover when the file is broken, so it never pulses forever', () => {
    render(<FeaturedWorkDemo media={[int8]} controlLabels={controlLabels} />);

    fireEvent.error(screen.getByRole('img', { name: 'INT8' }));

    expect(placeholder().classList.contains('opacity-0')).toBe(true);
  });
});

describe('FeaturedWorkDemo frame', () => {
  const frame = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('figure .aspect-video');

  it("draws every clip in a 16:9 box, whatever the file's own ratio", () => {
    const { container } = render(
      <FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />
    );
    const video = videoEl();
    Object.defineProperty(video, 'videoWidth', {
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(video, 'videoHeight', {
      configurable: true,
      value: 670,
    });
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(frame(container)).not.toBeNull();
    expect(frame(container)?.getAttribute('style')).toBeNull();
  });

  it('draws an image in the same 16:9 box as a clip', () => {
    const { container } = render(
      <FeaturedWorkDemo media={[int8]} controlLabels={controlLabels} />
    );
    const image = screen.getByRole('img', { name: 'INT8' });
    Object.defineProperty(image, 'naturalWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(image, 'naturalHeight', {
      configurable: true,
      value: 200,
    });

    fireEvent.load(image);

    expect(frame(container)?.getAttribute('style')).toBeNull();
  });
});

describe('FeaturedWorkDemo play/pause button', () => {
  it('pauses and resumes a playing clip on click', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);

    fireEvent.click(clip());
    expect(clip().getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(clip());
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a clip the visitor paused paused when it scrolls back into view', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);
    fireEvent.click(clip());

    visible(false);
    visible(true);

    expect(clip().getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles from the keyboard with Enter and with Space', async () => {
    const user = userEvent.setup();
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
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
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    visible(true);

    expect(calls).not.toContain('play');
    expect(clip().getAttribute('aria-pressed')).toBe('false');
  });
});

describe('FeaturedWorkDemo full screen', () => {
  const fullscreenButton = () =>
    screen.getByRole('button', { name: 'Full screen FP16' });
  const zoomIn = () => screen.getByRole('button', { name: 'Zoom in' });
  const zoomOut = () => screen.getByRole('button', { name: 'Zoom out' });
  const level = () => screen.getByRole('button', { name: /Reset zoom/ });
  const exit = () => screen.getByRole('button', { name: 'Exit full screen' });
  /** The box full screen takes: the clip's own button sits inside it, beside the toolbar. */
  const stage = () => clip().parentElement as HTMLElement;
  const original = Object.getOwnPropertyDescriptor(
    document,
    'fullscreenEnabled'
  );
  const originalRequest = HTMLElement.prototype.requestFullscreen;
  let requested: HTMLElement[] = [];
  let refuse = false;

  beforeEach(() => {
    requested = [];
    refuse = false;
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: true,
    });
    HTMLElement.prototype.requestFullscreen = function request(
      this: HTMLElement
    ) {
      requested.push(this);
      return refuse ? Promise.reject(new Error('refused')) : Promise.resolve();
    };
  });
  afterEach(() => {
    HTMLElement.prototype.requestFullscreen = originalRequest;
    if (original)
      Object.defineProperty(document, 'fullscreenEnabled', original);
    else Reflect.deleteProperty(document, 'fullscreenEnabled');
  });

  it('offers a button beside the play button, never inside it', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    expect(fullscreenButton()).toBeTruthy();
    expect(clip().contains(fullscreenButton())).toBe(false);
  });

  it('offers none for an image', () => {
    render(<FeaturedWorkDemo media={[int8]} controlLabels={controlLabels} />);

    expect(screen.queryByRole('button', { name: /Full screen/ })).toBeNull();
  });

  it('takes the clip stage full screen where the browser has an element API', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    fireEvent.click(fullscreenButton());

    expect(requested).toEqual([stage()]);
  });

  it('hides the full-screen button only where a mouse can hover, so a touch screen always sees it', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    const classes = fullscreenButton().className.split(' ');
    expect(classes).toContain('can-hover:opacity-0');
    expect(classes).toContain('can-hover:group-hover/stage:opacity-100');
    expect(classes).toContain('can-hover:focus-visible:opacity-100');
    expect(classes).toContain('can-hover:group-focus-within/stage:opacity-100');
    // Not hidden for everyone: a bare `opacity-0` would take it away from a phone.
    expect(classes).not.toContain('opacity-0');
  });

  /** A click that reports `at` as its time, so two taps can be placed apart exactly. */
  const tap = (at: number) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'timeStamp', { value: at });
    act(() => {
      clip().dispatchEvent(event);
    });
  };

  it('takes the clip full screen on a double tap, and leaves it playing', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);

    tap(1000);
    tap(1200);

    expect(requested).toEqual([stage()]);
    expect(
      screen.getByRole('button', { name: 'Exit full screen' })
    ).toBeTruthy();
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('does not take a clip full screen on one tap, or on two taps far apart', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);

    tap(1000);
    expect(requested).toEqual([]);
    expect(clip().getAttribute('aria-pressed')).toBe('false');

    tap(1400);
    expect(requested).toEqual([]);
    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('does not leave a clip paused that was only tapped twice', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);
    tap(1000);
    tap(1200);

    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    act(() => {
      visible(true);
    });

    expect(clip().getAttribute('aria-pressed')).toBe('true');
  });

  it('shows the toolbar in place when the browser refuses element full screen', () => {
    refuse = true;
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    fireEvent.click(fullscreenButton());

    expect(zoomIn()).toBeTruthy();
    expect(exit()).toBeTruthy();
  });

  it('shows the toolbar in place where the browser has no element API, as on iPhone', () => {
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: false,
    });
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    fireEvent.click(fullscreenButton());

    expect(requested).toEqual([]);
    expect(zoomIn()).toBeTruthy();
  });

  it('turns sound on in full screen and mutes again on leaving', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    const video = videoEl();
    fireEvent.click(fullscreenButton());
    expect(video.muted).toBe(false);

    fireEvent.click(exit());

    expect(video.muted).toBe(true);
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
  });

  it('leaves with Escape', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    fireEvent.click(fullscreenButton());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
  });

  it('keeps playing while the page leaves the viewport for full screen, and resumes on leaving', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    visible(true);
    fireEvent.click(fullscreenButton());

    // The page is hidden behind the player before `fullscreenchange` arrives.
    visible(false);
    expect(calls.at(-1)).not.toBe('pause');

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: stage(),
    });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    visible(true);

    expect(calls.at(-1)).toBe('play');
  });

  it('zooms in and out in steps, and the level reads back', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    fireEvent.click(fullscreenButton());
    expect(zoomOut().hasAttribute('disabled')).toBe(true);

    fireEvent.click(zoomIn());
    expect(level().textContent).toContain('150%');
    expect(videoEl().style.transform).toContain('scale(1.5)');

    fireEvent.click(zoomIn());
    fireEvent.click(zoomIn());
    fireEvent.click(zoomIn());
    expect(level().textContent).toContain('400%');
    expect(zoomIn().hasAttribute('disabled')).toBe(true);

    fireEvent.click(zoomOut());
    expect(level().textContent).toContain('300%');
  });

  it('puts the picture back at 100% when full screen is left and entered again', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);
    fireEvent.click(fullscreenButton());
    fireEvent.click(zoomIn());

    fireEvent.click(exit());
    fireEvent.click(fullscreenButton());

    expect(level().textContent).toContain('100%');
    expect(videoEl().style.transform).toBe('');
  });

  it('draws the clip unzoomed on the page, outside full screen', () => {
    render(<FeaturedWorkDemo media={[fp16]} controlLabels={controlLabels} />);

    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
    expect(videoEl().style.transform).toBe('');
  });
});
