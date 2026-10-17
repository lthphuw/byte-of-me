import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import { CopyButton } from './copy-button';

const writeText = mock((_text: string) => Promise.resolve());

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
});

afterEach(cleanup);

describe('CopyButton', () => {
  it('copies its content and then announces the copied label', async () => {
    render(
      <CopyButton
        content="https://cdn.test/a.png"
        label="Copy link"
        copiedLabel="Link copied"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });

    expect(writeText).toHaveBeenCalledWith('https://cdn.test/a.png');
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeDefined();
  });

  it('does not submit the form or trigger the card it sits in', async () => {
    const onSubmit = mock((e: { preventDefault: () => void }) =>
      e.preventDefault()
    );
    const onCardClick = mock();
    render(
      <form onSubmit={onSubmit}>
        <div onClick={onCardClick}>
          <CopyButton content="x" label="Copy" copiedLabel="Copied" />
        </div>
      </form>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
