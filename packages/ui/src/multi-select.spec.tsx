import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { MultiSelect } from './multi-select';

afterEach(cleanup);

const OPTIONS = [
  { label: 'React', value: 'react' },
  { label: 'Bun', value: 'bun' },
];

function renderSelect(selected: string[], onValueChange = mock()) {
  render(
    <MultiSelect
      options={OPTIONS}
      selected={selected}
      onValueChange={onValueChange}
      placeholder="Pick stacks"
      searchPlaceholder="Search stacks"
      emptyLabel="Nothing found"
      removeLabel={(label) => `Remove ${label}`}
      aria-label="Stacks"
    />
  );
  return onValueChange;
}

describe('MultiSelect', () => {
  it('shows the placeholder while nothing is selected', () => {
    renderSelect([]);

    expect(screen.getByText('Pick stacks')).toBeDefined();
  });

  it('draws a chip per selected option, each with a named remove button', () => {
    renderSelect(['react', 'bun']);

    expect(screen.getByRole('button', { name: 'Remove React' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove Bun' })).toBeDefined();
    expect(screen.queryByText('Pick stacks')).toBeNull();
  });

  it('keeps every button out of every other button', () => {
    renderSelect(['react', 'bun']);

    expect(document.querySelector('button button')).toBeNull();
  });

  it('removes only that chip, and leaves the list closed', () => {
    const onValueChange = renderSelect(['react', 'bun']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove React' }));

    expect(onValueChange).toHaveBeenCalledWith(['bun']);
    expect(screen.queryByPlaceholderText('Search stacks')).toBeNull();
  });

  it('opens a searchable list and adds the chosen option', () => {
    const onValueChange = renderSelect(['react']);

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByPlaceholderText('Search stacks')).toBeDefined();
    fireEvent.click(screen.getByText('Bun'));

    expect(onValueChange).toHaveBeenCalledWith(['react', 'bun']);
  });

  it('removes an already-selected option when it is chosen again', () => {
    const onValueChange = renderSelect(['react', 'bun']);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getAllByText('Bun').at(-1) as HTMLElement);

    expect(onValueChange).toHaveBeenCalledWith(['react']);
  });

  it('names the combobox from the aria-label a FormControl hands down', () => {
    renderSelect([]);

    expect(screen.getByRole('combobox', { name: 'Stacks' })).toBeDefined();
  });
});
