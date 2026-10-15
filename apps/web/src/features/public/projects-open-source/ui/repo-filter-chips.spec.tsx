import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { RepoFilterChips } from './repo-filter-chips';

const repos = [
  { nameWithOwner: 'roboflow/rf-detr', prCount: 26 },
  { nameWithOwner: 'roboflow/trackers', prCount: 2 },
];

afterEach(cleanup);

function renderChips(value: string | null, onChange = mock()) {
  render(
    <RepoFilterChips
      repos={repos}
      value={value}
      onChange={onChange}
      allLabel="All repos · 28"
      groupLabel="Filter by repository"
    />
  );
  return onChange;
}

describe('RepoFilterChips', () => {
  it('presses exactly the chip that matches the value, in the accessible tree', () => {
    renderChips('roboflow/trackers');

    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');
    expect(pressed.map((button) => button.textContent)).toEqual([
      'roboflow/trackers · 2',
    ]);
  });

  it('presses "all" when no repo is chosen', () => {
    renderChips(null);

    expect(
      screen
        .getByRole('button', { name: 'All repos · 28' })
        .getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('reports the repo a chip names, and null for "all"', () => {
    const onChange = renderChips(null);

    fireEvent.click(screen.getByRole('button', { name: 'roboflow/rf-detr · 26' }));
    expect(onChange).toHaveBeenLastCalledWith('roboflow/rf-detr');

    fireEvent.click(screen.getByRole('button', { name: 'All repos · 28' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('labels the group for assistive tech', () => {
    renderChips(null);

    expect(
      screen.getByRole('group', { name: 'Filter by repository' })
    ).toBeDefined();
  });
});
