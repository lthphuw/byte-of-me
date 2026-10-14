/**
 * A featured work as a visitor meets it: the title with its proof badges beside it, then
 * the demo. Renders the real component; no mocks. happy-dom cannot lay anything out, so
 * the layout is pinned as a class contract.
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
          #512
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
};

function renderItem(
  props: Partial<ComponentProps<typeof FeaturedWorkItem>> = {}
) {
  return render(<FeaturedWorkItem anchorId={ANCHOR} {...work} {...props} />);
}

afterEach(cleanup);

describe('FeaturedWorkItem header', () => {
  it('leaves the title as plain text, so the badges are the only links', () => {
    renderItem();

    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /#512/ })).toBeTruthy();
  });

  it('puts the badges on the same line as the title, not under it', () => {
    renderItem();

    const heading = screen.getByRole('heading', { name: 'Faster detector export' });
    const list = screen.getByRole('list', { name: 'Pull requests' });
    expect(heading.parentElement).toBe(list.parentElement);
  });

  it('draws no badge list for a work without links', () => {
    renderItem({ links: null });

    expect(screen.queryByRole('list', { name: 'Pull requests' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Faster detector export' })
    ).toBeTruthy();
  });
});

const pair: ComponentProps<typeof FeaturedWorkItem>['media'] = [
  {
    id: 'm1',
    url: 'https://cdn.example.com/fp16.mp4',
    isVideo: true,
    knownRatio: null,
    caption: 'FP16',
    name: 'FP16',
    playLabel: 'Play FP16',
    fullscreenLabel: 'Full screen FP16',
  },
  {
    id: 'm2',
    url: 'https://cdn.example.com/int8.gif',
    isVideo: false,
    knownRatio: null,
    caption: 'INT8',
    name: 'INT8',
    playLabel: 'Play INT8',
    fullscreenLabel: 'Full screen INT8',
  },
];

describe('FeaturedWorkItem demo', () => {
  it('is only a title and badges when there is no demo', () => {
    renderItem({ media: [] });

    expect(document.querySelector('figure')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('draws the two clips of the demo, with no toggle', () => {
    renderItem({ media: pair });

    expect(document.querySelector('video')).not.toBeNull();
    expect(document.querySelector('img')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /details$/ })).toBeNull();
  });

  it('puts the title and badges first, then the demo', () => {
    renderItem({ media: pair });

    const order = [
      screen.getByRole('heading', { name: /Faster detector export/ }),
      screen.getByRole('list', { name: 'Pull requests' }),
      document.querySelector('figure'),
    ];
    for (let i = 0; i < order.length - 1; i += 1) {
      const position = order[i]?.compareDocumentPosition(order[i + 1] as Node);
      expect((position ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

/**
 * The demo sits under the title on every width. On a phone it is a swipeable strip
 * that bleeds to the screen edge (the shell's gutter is 32px); from md it is two
 * columns, with no bleed.
 */
describe('FeaturedWorkItem demo layout', () => {
  it('lays the demo as a swipeable strip below md, with two columns from md', () => {
    renderItem({ media: pair });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.classList.contains('snap-x')).toBe(true);
    expect(strip?.classList.contains('overflow-x-auto')).toBe(true);
    expect(strip?.classList.contains('md:grid-cols-2')).toBe(true);
  });

  it('gives a single clip the full width of the card on a phone', () => {
    renderItem({ media: pair.slice(0, 1) });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.className).toContain('[&>figure]:w-full');
    expect(strip?.className).not.toContain('[&>figure]:w-[82%]');
  });

  it('sizes each clip of a pair to most of the card, so the next one peeks in', () => {
    renderItem({ media: pair });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.className).toContain('[&>figure]:w-[82%]');
  });

  it('bleeds the strip to the card edge on a phone and drops the bleed from md', () => {
    renderItem({ media: pair });

    const strip = document.querySelector('figure')?.parentElement;
    expect(strip?.classList.contains('-mx-4')).toBe(true);
    expect(strip?.classList.contains('md:mx-0')).toBe(true);
  });
});
