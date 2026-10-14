import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { Badge } from './badge';

afterEach(cleanup);

describe('Badge', () => {
  it('is a static label: no pointer cursor, no hover colour, no focus ring', () => {
    render(<Badge variant="secondary">draft</Badge>);

    const classes = screen.getByText('draft').className;
    expect(classes).not.toContain('cursor-pointer');
    expect(classes).not.toContain('hover:');
    expect(classes).not.toContain('focus-visible:');
  });

  it('styles the child itself under asChild, with no wrapper element', () => {
    const { container } = render(
      <Badge asChild variant="secondary">
        <button type="button">react</button>
      </Badge>
    );

    const button = screen.getByRole('button', { name: 'react' });
    expect(button.parentElement).toBe(container);
    expect(button.className).toContain('cursor-pointer');
    expect(button.className).toContain('hover:bg-secondary/80');
    expect(button.className).toContain('focus-visible:ring-2');
  });

  it('keeps the child behaviour: a click reaches its handler', () => {
    const onClick = mock();
    render(
      <Badge asChild>
        <button type="button" onClick={onClick}>
          go
        </button>
      </Badge>
    );

    fireEvent.click(screen.getByRole('button', { name: 'go' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
