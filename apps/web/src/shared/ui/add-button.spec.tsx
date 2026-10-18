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

  it('takes the default size, and lets a caller pick another', () => {
    render(
      <>
        <AddButton label="One" onClick={mock()} />
        <AddButton label="Two" onClick={mock()} size="sm" />
      </>
    );

    expect(screen.getByRole('button', { name: 'One' }).className).toContain(
      'h-8'
    );
    expect(screen.getByRole('button', { name: 'Two' }).className).toContain(
      'h-7'
    );
  });
});
