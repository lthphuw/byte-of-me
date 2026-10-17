/**
 * What a visitor can observe of the education "more achievements" fold: the toggle's label flips
 * with the state and says whether the rows are open, the folded rows stay on the page, and the
 * rows read the state through `data-fold` on the wrapper. Renders the real components; no mocks.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { AchievementFold, AchievementFoldToggle } from './achievement-fold';

function renderFold() {
  return render(
    <AchievementFold>
      <ul>
        <li>
          <a href="https://example.com/certificate">Folded certificate</a>
        </li>
        <li>
          <AchievementFoldToggle
            showMoreLabel="2 more achievements"
            showLessLabel="Show less"
          />
        </li>
      </ul>
    </AchievementFold>
  );
}

function foldState(container: HTMLElement) {
  return container.querySelector('[data-fold]')?.getAttribute('data-fold');
}

afterEach(cleanup);

describe('AchievementFold', () => {
  it('starts shut: offers to show more, and the folded rows are on the page', () => {
    const { container } = renderFold();

    const toggle = screen.getByRole('button', { name: '2 more achievements' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(foldState(container)).toBe('closed');
    expect(screen.getByText('Folded certificate')).toBeTruthy();
  });

  it('opens on click: the label becomes show less and the fold reads open', () => {
    const { container } = renderFold();

    fireEvent.click(
      screen.getByRole('button', { name: '2 more achievements' })
    );

    const toggle = screen.getByRole('button', { name: 'Show less' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(foldState(container)).toBe('open');
  });

  it('closes on the second click, returning to the first state', () => {
    const { container } = renderFold();

    fireEvent.click(
      screen.getByRole('button', { name: '2 more achievements' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));

    const toggle = screen.getByRole('button', { name: '2 more achievements' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(foldState(container)).toBe('closed');
  });
});
