/**
 * An expandable featured work as a visitor meets it: one toggle per row, a body
 * that is inert until the row opens, and deep links that open their own row only.
 * Renders the real component; no mocks.
 */
import type { ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  details: (
    <>
      <p>How it was done: a streaming writer.</p>
      <a href="https://github.com/roboflow/rf-detr/pull/512" target="_blank" rel="noopener noreferrer">
        View on GitHub
      </a>
    </>
  ),
};

function renderItem(props: Partial<ComponentProps<typeof FeaturedWorkItem>> = {}) {
  return render(<FeaturedWorkItem anchorId={ANCHOR} {...work} {...props} />);
}

const toggle = () => screen.getByRole('button', { name: 'Faster detector export' });
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
  it('has one toggle, collapsed, whose aria-expanded flips on each click', () => {
    renderItem();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(controlledRegion()).toBeTruthy();

    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
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

    await waitFor(() => expect(toggle().getAttribute('aria-expanded')).toBe('true'));
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

    await waitFor(() => expect(toggle().getAttribute('aria-expanded')).toBe('true'));
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
    await waitFor(() => expect(toggleFor(other).getAttribute('aria-expanded')).toBe('true'));
    expect(toggleFor(ANCHOR).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('FeaturedWorkItem plain row', () => {
  it('is one new-tab link whose accessible name says it opens in a new tab', () => {
    renderItem({ href: 'https://example.com/post', details: null });

    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain('(opens in a new tab)');
    expect(screen.getByRole('link', { name: /Faster detector export.*\(opens in a new tab\)/ })).toBe(link);
  });
});
