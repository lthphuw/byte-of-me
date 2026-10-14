/**
 * A featured work as a visitor meets it: the title with its links, the demo, then the
 * details. The details are clamped with a toggle only when they overflow; happy-dom cannot
 * lay anything out, so a short body shows no toggle here, and the layout is pinned as a
 * class contract. Renders the real component; no mocks.
 */
import type { ComponentProps } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../../messages/en.json';

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
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{
        components: { expandableText: en.components.expandableText },
      }}
    >
      <FeaturedWorkItem anchorId={ANCHOR} {...work} {...props} />
    </NextIntlClientProvider>
  );
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
 * The demo sits under the title on every width. On a phone a pair is one swipeable strip that
 * bleeds to the screen edge (the shell's gutter is 32px), the next clip peeking in. From sm
 * there is nothing to swipe: a pair is two equal columns inside the card, a lone clip fills
 * the row.
 */
describe('FeaturedWorkItem demo layout', () => {
  const stripOf = () => document.querySelector('figure')?.parentElement;

  it('lays the pair as a swipeable strip on a phone and two equal columns from sm', () => {
    renderItem({ media: pair });

    const strip = stripOf();
    expect(strip?.classList.contains('snap-x')).toBe(true);
    expect(strip?.classList.contains('overflow-x-auto')).toBe(true);
    expect(strip?.classList.contains('sm:overflow-visible')).toBe(true);
    expect(strip?.classList.contains('sm:grid')).toBe(true);
    expect(strip?.classList.contains('sm:grid-cols-2')).toBe(true);
  });

  it('sizes each clip of a pair at 82% on a phone, so the next one peeks in, and drops it from sm', () => {
    renderItem({ media: pair });

    expect(stripOf()?.className).toContain('[&>figure]:w-[82%]');
    expect(stripOf()?.className).toContain('sm:[&>figure]:w-auto');
    expect(stripOf()?.className).not.toContain('58%');
  });

  it('gives a single clip the full width of the card at every width', () => {
    renderItem({ media: pair.slice(0, 1) });

    const strip = stripOf();
    expect(strip?.className).toContain('[&>figure]:w-full');
    expect(strip?.className).not.toContain('[&>figure]:w-[82%]');
    expect(strip?.classList.contains('sm:grid-cols-2')).toBe(false);
  });

  it('bleeds the strip to the card edge on a phone and drops the bleed from sm', () => {
    renderItem({ media: pair });

    expect(stripOf()?.classList.contains('-mx-4')).toBe(true);
    expect(stripOf()?.classList.contains('sm:mx-0')).toBe(true);
  });

  it('draws the details at the card width, so their edge lines up with the demo', () => {
    renderItem({ media: pair });

    const body = bodyText().closest('div');
    expect(body?.className).not.toContain('max-w-prose');
  });
});
