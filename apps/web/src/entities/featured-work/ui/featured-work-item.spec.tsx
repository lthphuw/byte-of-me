/**
 * A featured work as a visitor meets it: the demo and the details are always on
 * show, there is no toggle, and the external link sits on the action line under the
 * demo. Renders the real component; no mocks.
 */
import type { ComponentProps } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { FeaturedWorkItem } from './featured-work-item';

const ANCHOR = 'featured-works-w1';

/** The row's content, shared by every item a test renders. */
const work: Omit<ComponentProps<typeof FeaturedWorkItem>, 'anchorId'> = {
  number: '01',
  title: 'Faster detector export',
  meta: <span>roboflow/rf-detr</span>,
  href: null,
  newTabLabel: '(opens in a new tab)',
  media: [],
  demoControls: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom',
    exitFullscreen: 'Exit full screen',
  },
  details: (
    <>
      <p>How it was done: a streaming writer.</p>
      <a
        href="https://github.com/roboflow/rf-detr/pull/512"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on GitHub
      </a>
    </>
  ),
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

describe('FeaturedWorkItem plain row', () => {
  it('is one new-tab link whose accessible name says it opens in a new tab', () => {
    renderItem({ href: 'https://example.com/post', details: null });

    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain('(opens in a new tab)');
    expect(
      screen.getByRole('link', {
        name: /Faster detector export.*\(opens in a new tab\)/,
      })
    ).toBe(link);
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
    expect(
      screen.queryByRole('button', { name: /details$/ })
    ).toBeNull();
  });

  it('puts the demo first, then the action line, then the details', () => {
    renderItem({
      media: pair,
      footer: <a href="https://example.com/work">Visit example.com</a>,
    });

    const order = [
      document.querySelector('figure'),
      screen.getByRole('link', { name: 'Visit example.com' }),
      bodyText(),
    ];
    for (let i = 0; i < order.length - 1; i += 1) {
      const position = order[i]?.compareDocumentPosition(order[i + 1] as Node);
      expect((position ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('keeps the external link outside any inert region', () => {
    renderItem({
      media: pair,
      footer: <a href="https://example.com/work">Visit example.com</a>,
    });

    const link = screen.getByRole('link', { name: 'Visit example.com' });

    expect(link.closest('[inert]')).toBeNull();
  });
});

/**
 * happy-dom cannot lay anything out, so the grid is pinned as a class contract.
 * Tailwind 3 emits `col-span-N` as `grid-column: span N / span N`, which resets an
 * explicit `col-start-*` at the same breakpoint: the item then auto-places into column 1.
 */
describe('FeaturedWorkItem body grid classes', () => {
  const ORDER = ['', 'sm', 'md', 'lg', 'xl'];
  /** Breakpoint rank of a utility: `md:col-span-2` -> 2, `col-start-2` -> 0. */
  const rankOf = (name: string) =>
    ORDER.indexOf(
      name.includes(':') ? name.slice(0, name.lastIndexOf(':')) : ''
    );
  const isSpan = (name: string) => /(^|:)col-span-/.test(name);
  const isStart = (name: string) => /(^|:)col-start-/.test(name);

  it('never lets a col-span reset a col-start that applies at its breakpoint', () => {
    const { container } = renderItem({
      media: pair,
      footer: <a href="https://example.com/work">Visit example.com</a>,
    });

    // A span at `md` also wipes a base `col-start-2`, so every start at or below it counts.
    const offenders: string[] = [];
    for (const element of container.querySelectorAll<HTMLElement>('[class]')) {
      const classes = [...element.classList];
      for (const span of classes.filter(isSpan)) {
        for (const start of classes.filter(isStart)) {
          if (rankOf(start) <= rankOf(span))
            offenders.push(`${span} + ${start}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('places the demo and the action line from the title track to the last, from md', () => {
    const { container } = renderItem({
      media: pair,
      footer: <a href="https://example.com/work">Visit example.com</a>,
    });
    const demo = container.querySelector('figure')?.parentElement;
    const actions = screen.getByRole('link', { name: 'Visit example.com' })
      .parentElement;

    for (const element of [demo, actions]) {
      expect(element?.classList.contains('md:col-start-2')).toBe(true);
      expect(element?.classList.contains('md:col-end-[-1]')).toBe(true);
    }
  });

  it('keeps the details in the title track', () => {
    renderItem();
    const details = bodyText().closest<HTMLElement>('.md\\:col-start-2');

    expect(details).not.toBeNull();
    expect(details?.classList.contains('md:col-end-[-1]')).toBe(false);
  });
});
