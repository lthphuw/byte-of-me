import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { NextIntlClientProvider } from 'next-intl';

// The catalogue lives outside `src/`, so the `@/` alias cannot reach it.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';

import { EditRecordDialog } from './edit-record-dialog';

afterEach(cleanup);

type Props = Partial<Parameters<typeof EditRecordDialog>[0]>;

function renderDialog(props: Props = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EditRecordDialog
        open
        onOpenChange={mock()}
        isEditing
        entity="tag"
        formId="tag-form"
        isDirty={false}
        hasRecord
        skeleton={<p>loading the tag</p>}
        {...props}
      >
        <form id="tag-form">
          <p>the tag form</p>
        </form>
      </EditRecordDialog>
    </NextIntlClientProvider>
  );
}

const saveButton = () =>
  screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

describe('EditRecordDialog', () => {
  it('titles an edit and a create after the entity', () => {
    renderDialog();
    expect(screen.getByRole('heading', { name: /edit tag/i })).toBeTruthy();
    cleanup();

    renderDialog({ isEditing: false, hasRecord: false });
    expect(screen.getByRole('heading', { name: /new tag/i })).toBeTruthy();
  });

  it('shows the skeleton and holds Save while the record loads', () => {
    renderDialog({ isLoadingInitialData: true, hasRecord: false });

    expect(screen.getByText('loading the tag')).toBeTruthy();
    expect(screen.queryByText('the tag form')).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it('offers Retry when the load failed, and holds Save', () => {
    const onRetryLoad = mock();
    renderDialog({ hasLoadError: true, hasRecord: false, onRetryLoad });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });

  it('mounts the form and enables Save once the record is in hand', () => {
    renderDialog();

    expect(screen.getByText('the tag form')).toBeTruthy();
    expect(saveButton().disabled).toBe(false);
  });

  it('does not hold Save for a new record that has nothing to load', () => {
    renderDialog({ isEditing: false, hasRecord: false });

    expect(saveButton().disabled).toBe(false);
  });
});
