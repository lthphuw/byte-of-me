/**
 * What a visitor can observe of the education "show more" fold: the label flips
 * with the state, the folded rows stay on the page, and they are inert until the
 * fold opens. Renders the real component; no mocks.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { AchievementFold } from './achievement-fold';

function renderFold() {
  return render(
    <AchievementFold
      showMoreLabel="2 more achievements"
      showLessLabel="Show less"
    >
      <a href="https://example.com/certificate">Folded certificate</a>
    </AchievementFold>
  );
}

/** The region the toggle controls, found through the button's own `aria-controls`. */
function controlledRegion(button: HTMLElement): HTMLElement {
  const id = button.getAttribute('aria-controls');
  const region = id ? document.getElementById(id) : null;
  if (!region) throw new Error('aria-controls does not name an element');
  return region;
}

afterEach(cleanup);

describe('AchievementFold', () => {
  it('starts shut: offers to show more, and the folded rows are inert', () => {
    renderFold();

    const toggle = screen.getByRole('button', { name: '2 more achievements' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(controlledRegion(toggle).hasAttribute('inert')).toBe(true);
    expect(screen.getByText('Folded certificate')).toBeTruthy();
  });

  it('opens on click: the label becomes show less and the rows are released', () => {
    renderFold();

    fireEvent.click(
      screen.getByRole('button', { name: '2 more achievements' })
    );

    const toggle = screen.getByRole('button', { name: 'Show less' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(controlledRegion(toggle).hasAttribute('inert')).toBe(false);
  });

  it('closes on the second click, returning to the first state', () => {
    renderFold();

    fireEvent.click(
      screen.getByRole('button', { name: '2 more achievements' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));

    const toggle = screen.getByRole('button', { name: '2 more achievements' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(controlledRegion(toggle).hasAttribute('inert')).toBe(true);
  });
});
