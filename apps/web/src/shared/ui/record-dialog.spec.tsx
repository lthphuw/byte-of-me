import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';

import { RecordDialog } from './record-dialog';

afterEach(() => {
  cleanup();
});

type Props = Parameters<typeof RecordDialog>[0];

/** The Radix overlay is the only `fixed inset-0` layer: the content uses `max-md:inset-0`. */
function overlayOf(root: Document): Element {
  const overlay = root.querySelector('.fixed.inset-0');
  if (!overlay) throw new Error('the dialog overlay did not render');
  return overlay;
}

function tick() {
  return act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

/**
 * A primary-button click on the overlay, as a browser sends it. Radix attaches
 * its listener on a timer after mount, and dismisses on the click, so both
 * waits are real and a bare pointerdown would never reach the handler.
 */
async function clickOverlay() {
  await tick();
  const overlay = overlayOf(document);
  fireEvent.pointerDown(overlay);
  fireEvent.pointerUp(overlay);
  fireEvent.mouseDown(overlay);
  fireEvent.mouseUp(overlay);
  fireEvent.click(overlay);
  await tick();
}

function renderDialog(props: Partial<Props> & Pick<Props, 'onOpenChange'>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecordDialog
        open
        title="Edit project"
        description="Change the project's details."
        formId="record-form"
        {...props}
      >
        <form id="record-form" onSubmit={(event) => event.preventDefault()}>
          <input aria-label="Name" />
        </form>
      </RecordDialog>
    </NextIntlClientProvider>
  );
}

describe('RecordDialog', () => {
  it('closes from Escape when nothing is pending', () => {
    const onOpenChange = mock(() => {});
    renderDialog({ onOpenChange });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes from the overlay when nothing is pending', async () => {
    const onOpenChange = mock(() => {});
    renderDialog({ onOpenChange });

    await clickOverlay();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('ignores close requests while saving', async () => {
    const onOpenChange = mock(() => {});
    renderDialog({ isPending: true, onOpenChange });

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await clickOverlay();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('asks before discarding a dirty form', () => {
    const onOpenChange = mock(() => {});
    renderDialog({ isDirty: true, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits the form it names', () => {
    renderDialog({ onOpenChange: mock(() => {}) });

    const save = screen.getByRole('button', { name: 'Save' });

    expect(save.getAttribute('type')).toBe('submit');
    expect(save.getAttribute('form')).toBe('record-form');
  });

  it('renders the description', () => {
    renderDialog({ onOpenChange: mock(() => {}) });

    expect(screen.queryByText("Change the project's details.")).not.toBeNull();
  });
});
