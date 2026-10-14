import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { ConfirmDeleteDialog } from './confirm-delete-dialog';

afterEach(cleanup);

function renderDialog(isLoading = false) {
  const onClose = mock();
  const onConfirm = mock();
  render(
    <ConfirmDeleteDialog
      isOpen
      isLoading={isLoading}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete tag?"
      description="This removes it for good."
      actionText="Delete"
      cancelText="Keep"
    />
  );
  return { onClose, onConfirm };
}

describe('ConfirmDeleteDialog', () => {
  it('shows the text it is given', () => {
    renderDialog();

    expect(screen.getByText('Delete tag?')).toBeDefined();
    expect(screen.getByText('This removes it for good.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeDefined();
  });

  it('confirms without closing itself, so the caller decides when it ends', () => {
    const { onClose, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel and on Escape when idle', () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape while the delete is in flight and disables both buttons', () => {
    const { onClose } = renderDialog(true);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: 'Keep' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});
