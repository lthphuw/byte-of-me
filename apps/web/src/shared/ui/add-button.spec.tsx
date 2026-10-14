import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { AddButton } from './add-button';

afterEach(cleanup);

describe('AddButton', () => {
  it('is named by its label and calls onClick', () => {
    const onClick = mock();
    render(<AddButton label="New tag" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'New tag' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('takes the dashboard control height with a pointer, and lets a caller override it', () => {
    render(
      <>
        <AddButton label="One" onClick={mock()} />
        <AddButton label="Two" onClick={mock()} className="can-hover:min-h-8" />
      </>
    );

    const one = screen.getByRole('button', { name: 'One' }).className;
    const two = screen.getByRole('button', { name: 'Two' }).className;

    expect(one).toContain('can-hover:min-h-9');
    expect(two).toContain('can-hover:min-h-8');
    expect(two).not.toContain('can-hover:min-h-9');
  });
});
