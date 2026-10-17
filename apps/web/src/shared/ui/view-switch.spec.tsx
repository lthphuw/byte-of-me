import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'bun:test';

import { ViewSwitch, ViewSwitchRoot } from './view-switch';

afterEach(cleanup);

function renderView() {
  return render(
    <ViewSwitchRoot id="section">
      <h2>Open source</h2>
      <ViewSwitch
        labels={{
          group: 'Contributions view',
          compact: 'Compact',
          details: 'Details',
        }}
      />
      <ul>
        <li>repo</li>
      </ul>
    </ViewSwitchRoot>
  );
}

function pressed() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.getAttribute('aria-label'));
}

describe('ViewSwitch', () => {
  it('starts in Compact, the view the server HTML shows', () => {
    const { container } = renderView();

    expect(pressed()).toEqual(['Compact']);
    expect(container.querySelector('section')?.dataset.view).toBe('compact');
  });

  it('switches the section to Details and presses only that option', () => {
    const { container } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(pressed()).toEqual(['Details']);
    expect(container.querySelector('section')?.dataset.view).toBe('details');
  });

  it('goes back to Compact', () => {
    const { container } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compact' }));

    expect(pressed()).toEqual(['Compact']);
    expect(container.querySelector('section')?.dataset.view).toBe('compact');
  });

  it('names the two options as one labelled group', () => {
    renderView();

    const group = screen.getByRole('group', { name: 'Contributions view' });
    expect(group.querySelectorAll('button')).toHaveLength(2);
  });

  it('carries the section id the page links to', () => {
    const { container } = renderView();

    expect(container.querySelector('section')?.id).toBe('section');
  });
});
