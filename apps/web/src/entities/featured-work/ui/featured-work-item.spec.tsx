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

function renderItem(props: Partial<ComponentProps<typeof FeaturedWorkItem>> = {}) {
  return render(
    <FeaturedWorkItem
      anchorId={ANCHOR}
      number="01"
      title="Faster detector export"
      description="Cut the export time in half."
      meta={<span>roboflow/rf-detr</span>}
      href={null}
      details={
        <>
          <p>How it was done: a streaming writer.</p>
          <a href="https://github.com/roboflow/rf-detr/pull/512" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </>
      }
      {...props}
    />
  );
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

  it('leaves a row shut when the hash names a different row', async () => {
    renderItem();

    act(() => {
      window.location.hash = '#featured-works-other';
    });

    await waitFor(() => expect(window.location.hash).toBe('#featured-works-other'));
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
  });
});
