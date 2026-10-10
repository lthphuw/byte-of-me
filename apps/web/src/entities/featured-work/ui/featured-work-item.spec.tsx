/**
 * A featured work as a visitor meets it: the demo always on show, one details toggle
 * per row whose body is inert until it opens, and deep links that open their own row only.
 * Renders the real component; no mocks.
 */
import type { ComponentProps } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'bun:test';

import { FeaturedWorkItem } from './featured-work-item';

const ANCHOR = 'featured-works-w1';

/** The row's content, shared by every item a test renders. */
const work: Omit<ComponentProps<typeof FeaturedWorkItem>, 'anchorId'> = {
  number: '01',
  title: 'Faster detector export',
  description: 'Cut the export time in half.',
  meta: <span>roboflow/rf-detr</span>,
  href: null,
  newTabLabel: '(opens in a new tab)',
  media: [],
  showDetailsLabel: 'Show details',
  hideDetailsLabel: 'Hide details',
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

const toggle = () => screen.getByRole('button', { name: /details$/ });
const bodyLink = () => screen.getByRole('link', { name: 'View on GitHub' });
/** The body's region: the element the toggle's `aria-controls` names. */
function controlledRegion(): HTMLElement {
  const id = toggle().getAttribute('aria-controls');
  const region = id ? document.getElementById(id) : null;
  if (!region) throw new Error('aria-controls does not name an element');
  return region;
}
/** The toggle of the row with this id, found by the id it controls. */
function toggleFor(anchorId: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `button[aria-controls="${anchorId}-details"]`
  );
  if (!button) throw new Error(`no toggle controls ${anchorId}-details`);
  return button;
}

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('FeaturedWorkItem disclosure', () => {
  it('has one toggle, collapsed, whose aria-expanded and label flip on each click', () => {
    renderItem();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toBe('Show details');
    expect(controlledRegion()).toBeTruthy();

    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().textContent).toBe('Hide details');

    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
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

  it('keeps the body inert while closed and releases it once open', () => {
    renderItem();

    expect(controlledRegion().hasAttribute('inert')).toBe(true);
    expect(bodyLink().closest('[inert]')).not.toBeNull();

    fireEvent.click(toggle());

    expect(controlledRegion().hasAttribute('inert')).toBe(false);
    expect(bodyLink().closest('[inert]')).toBeNull();
  });

  it('does not write the hash when toggled', () => {
    renderItem();

    fireEvent.click(toggle());

    expect(window.location.hash).toBe('');
  });

  it('toggles from the keyboard with Enter and with Space', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.tab();
    expect(document.activeElement).toBe(toggle());

    await user.keyboard('{Enter}');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');

    await user.keyboard(' ');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('FeaturedWorkItem chevron', () => {
  const chevron = () => {
    const icon = toggle().querySelector('svg');
    if (!icon) throw new Error('the toggle has no chevron');
    return icon;
  };

  it('does not transition before the first toggle, whether shut or opened by a deep link', () => {
    window.location.hash = `#${ANCHOR}`;
    renderItem();

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(chevron().classList.contains('transition-none')).toBe(true);
    expect(chevron().classList.contains('transition-transform')).toBe(false);
  });

  it('transitions only its transform, and not under reduced motion, once toggled', () => {
    renderItem();
    fireEvent.click(toggle());

    const classes = chevron().classList;
    expect(classes.contains('transition-transform')).toBe(true);
    expect(classes.contains('motion-reduce:transition-none')).toBe(true);
    expect(classes.contains('transition-none')).toBe(false);
  });

  it('goes back to no transition when a deep link opens the row after it was toggled', async () => {
    renderItem();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(chevron().classList.contains('transition-transform')).toBe(true);

    act(() => {
      window.location.hash = `#${ANCHOR}`;
    });

    await waitFor(() =>
      expect(toggle().getAttribute('aria-expanded')).toBe('true')
    );
    expect(chevron().classList.contains('transition-none')).toBe(true);
  });
});

describe('FeaturedWorkItem deep links', () => {
  it('opens its own row on mount when the hash names it', () => {
    window.location.hash = `#${ANCHOR}`;
    renderItem();

    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(controlledRegion().hasAttribute('inert')).toBe(false);
  });

  it('opens its own row when the hash changes to it', async () => {
    renderItem();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');

    act(() => {
      window.location.hash = `#${ANCHOR}`;
    });

    await waitFor(() =>
      expect(toggle().getAttribute('aria-expanded')).toBe('true')
    );
  });

  it('leaves a row shut when the hash changes to a different row', async () => {
    const other = 'featured-works-other';
    render(
      <>
        <FeaturedWorkItem anchorId={ANCHOR} {...work} />
        <FeaturedWorkItem anchorId={other} {...work} />
      </>
    );
    expect(toggleFor(ANCHOR).getAttribute('aria-expanded')).toBe('false');
    expect(toggleFor(other).getAttribute('aria-expanded')).toBe('false');

    act(() => {
      window.location.hash = `#${other}`;
    });

    // The other row opens from the hashchange event itself, which proves the event
    // was handled. This row's listener was registered first, so it has run too.
    await waitFor(() =>
      expect(toggleFor(other).getAttribute('aria-expanded')).toBe('true')
    );
    expect(toggleFor(ANCHOR).getAttribute('aria-expanded')).toBe('false');
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
/** A work with a demo and no details: the shape of the first live work. */
const mediaOnly = { details: null, media: pair } as const;

describe('FeaturedWorkItem demo', () => {
  it('is plain with neither, details-only with a toggle, and demo-only with none', () => {
    renderItem({ details: null, media: [] });
    expect(screen.queryByRole('button')).toBeNull();
    cleanup();

    renderItem({ media: [] });
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    cleanup();

    renderItem(mediaOnly);
    expect(screen.queryByRole('button', { name: /details$/ })).toBeNull();
    expect(document.querySelectorAll('figure')).toHaveLength(2);
  });

  it('draws the demo at once, with the details still shut', () => {
    renderItem({ media: pair });

    expect(document.querySelector('video')).not.toBeNull();
    expect(document.querySelector('img')).not.toBeNull();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(controlledRegion().hasAttribute('inert')).toBe(true);
  });

  it('keeps the clip out of the shut details, so it stays reachable by keyboard', () => {
    renderItem({ media: pair });

    const clip = screen.getByRole('button', { name: 'Play FP16' });

    expect(clip.closest('[inert]')).toBeNull();
    expect(controlledRegion().contains(clip)).toBe(false);
  });

  it('leaves a demo-only work alone when the hash names it', () => {
    window.location.hash = `#${ANCHOR}`;
    renderItem(mediaOnly);

    expect(document.querySelectorAll('figure')).toHaveLength(2);
    expect(document.querySelector(`#${ANCHOR}-details`)).toBeNull();
  });

  it('puts the demo first, then the action line, then the details', () => {
    renderItem({
      media: pair,
      footer: <a href="https://example.com/work">Visit example.com</a>,
    });
    fireEvent.click(toggle());

    const order = [
      document.querySelector('figure'),
      toggle(),
      screen.getByRole('link', { name: 'Visit example.com' }),
      controlledRegion(),
    ];
    for (let i = 0; i < order.length - 1; i += 1) {
      const position = order[i]?.compareDocumentPosition(order[i + 1] as Node);
      expect((position ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('keeps the external link visible while the details are shut', () => {
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
    window.location.hash = `#${ANCHOR}`;
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
    const actions = toggle().parentElement;

    for (const element of [demo, actions]) {
      expect(element?.classList.contains('md:col-start-2')).toBe(true);
      expect(element?.classList.contains('md:col-end-[-1]')).toBe(true);
    }
  });

  it('keeps the details in the title track', () => {
    const { container } = renderItem(mediaOnly);
    const region = container.querySelector<HTMLElement>(`#${ANCHOR}-details`);

    expect(region).toBeNull();
    cleanup();

    const withDetails = renderItem({ media: pair }).container;
    const details = withDetails.querySelector<HTMLElement>(
      `#${ANCHOR}-details`
    );
    expect(details?.classList.contains('md:col-start-2')).toBe(true);
    expect(details?.classList.contains('md:col-end-[-1]')).toBe(false);
  });
});
