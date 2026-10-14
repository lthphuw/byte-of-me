/**
 * A featured work as a visitor meets it: its title is the one link, the demo and the
 * details are always on show, and there is no toggle. Renders the real component; no
 * mocks. happy-dom cannot lay anything out, so the layout is pinned as a class contract.
 */
import type { ComponentProps } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { FeaturedWorkItem } from './featured-work-item';

const ANCHOR = 'featured-works-w1';

/** The row's content, shared by every item a test renders. */
const work: Omit<ComponentProps<typeof FeaturedWorkItem>, 'anchorId'> = {
  title: 'Faster detector export',
  links: (
    <ul aria-label="Pull requests">
      <li>
        <a
          href="https://github.com/roboflow/rf-detr/pull/512"
          target="_blank"
          rel="noopener noreferrer"
        >
          INT8
        </a>
      </li>
    </ul>
  ),
  media: [],
  demoControls: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom',
    exitFullscreen: 'Exit full screen',
  },
  details: <p>How it was done: a streaming writer.</p>,
};

function renderItem(
  props: Partial<ComponentProps<typeof FeaturedWorkItem>> = {}
) {
  return render(<FeaturedWorkItem anchorId={ANCHOR} {...work} {...props} />);
}

const bodyText = () => screen.getByText('How it was done: a streaming writer.');

afterEach(cleanup);

describe('FeaturedWorkItem details', () => {
  it('shows the details at once, with no toggle and nothing inert', () => {
    renderItem();

    expect(screen.queryByRole('button')).toBeNull();
    expect(bodyText()).toBeTruthy();
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('leaves the title as plain text, not a button', () => {
    renderItem();

    expect(
      screen.queryByRole('button', { name: 'Faster detector export' })
    ).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
  });

  it('draws no details block for a work without details', () => {
    renderItem({ details: null });

    expect(
      screen.queryByText('How it was done: a streaming writer.')
    ).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('FeaturedWorkItem links', () => {
  it('leaves the title as plain text, so the links are the only links', () => {
    renderItem({ details: null });

    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'INT8' })).toBeTruthy();
  });

  it('shows the links from the row, under the title', () => {
    renderItem({ details: null });

    expect(screen.getByRole('list', { name: 'Pull requests' })).toBeTruthy();
  });

  it('keeps the links when the work also has a demo and details', () => {
    renderItem({ media: pair });

    expect(screen.getByRole('link', { name: 'INT8' })).toBeTruthy();
    expect(bodyText()).toBeTruthy();
  });
});

const pair: ComponentProps<typeof FeaturedWorkItem>['media'] = [
  {
    id: 'm1',
    url: 'https://cdn.example.com/fp16.mp4',
    isVideo: true,
    caption: 'FP16',
    name: 'FP16',
    playLabel: 'Play FP16',
    fullscreenLabel: 'Full screen FP16',
  },
  {
    id: 'm2',
    url: 'https://cdn.example.com/int8.gif',
    isVideo: false,
    caption: 'INT8',
    name: 'INT8',
    playLabel: 'Play INT8',
    fullscreenLabel: 'Full screen INT8',
  },
];

describe('FeaturedWorkItem demo', () => {
  it('is plain with neither a demo nor details, and shows each one it has', () => {
    renderItem({ details: null, media: [] });
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.querySelectorAll('figure')).toHaveLength(0);
    cleanup();

    renderItem({ media: [] });
    expect(bodyText()).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();

    renderItem({ details: null, media: pair });
    expect(document.querySelectorAll('figure')).toHaveLength(2);
    expect(
      screen.queryByText('How it was done: a streaming writer.')
    ).toBeNull();
  });

  it('draws the demo and the details together, with no toggle', () => {
    renderItem({ media: pair });

    expect(document.querySelector('video')).not.toBeNull();
    expect(document.querySelector('img')).not.toBeNull();
    expect(bodyText()).toBeTruthy();
    expect(screen.queryByRole('button', { name: /details$/ })).toBeNull();
  });

  it('puts the title first, then the links, then the demo, then the details', () => {
    renderItem({ media: pair });

    const order = [
      screen.getByRole('heading', { name: /Faster detector export/ }),
      screen.getByRole('list', { name: 'Pull requests' }),
      document.querySelector('figure'),
      bodyText(),
    ];
    for (let i = 0; i < order.length - 1; i += 1) {
      const position = order[i]?.compareDocumentPosition(order[i + 1] as Node);
      expect((position ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

/**
 * The demo sits under the title on every width, as one swipeable strip. On a phone it
 * bleeds to the screen edge (the shell's gutter is 32px); from md the strip keeps its
 * slider shape, with the next clip peeking in, and drops the bleed.
 */
describe('FeaturedWorkItem demo layout', () => {
  it('lays the pair as one swipeable strip on every width, not as a grid', () => {
    renderItem({ media: pair });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.classList.contains('snap-x')).toBe(true);
    expect(strip?.classList.contains('overflow-x-auto')).toBe(true);
    expect(strip?.classList.contains('md:grid')).toBe(false);
    expect(strip?.classList.contains('md:grid-cols-2')).toBe(false);
  });

  it('gives a single clip the full width of the card on a phone', () => {
    renderItem({ media: pair.slice(0, 1) });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.className).toContain('[&>figure]:w-full');
    expect(strip?.className).not.toContain('[&>figure]:w-[82%]');
  });

  it('sizes each clip of a pair so the next one peeks in: 82% on a phone, 58% from md', () => {
    renderItem({ media: pair });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.className).toContain('[&>figure]:w-[82%]');
    expect(strip?.className).toContain('md:[&>figure]:w-[58%]');
  });

  it('bleeds the strip to the card edge on a phone and drops the bleed from md', () => {
    renderItem({ media: pair });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.classList.contains('-mx-4')).toBe(true);
    expect(strip?.classList.contains('md:mx-0')).toBe(true);
  });
});
