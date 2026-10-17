import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, mock } from 'bun:test';

import { testEditorLabels } from '../../editor-labels.test-fixture';

import { ReferenceForm } from './reference-form';

afterEach(cleanup);

function setup() {
  const onSubmit = mock();
  const onCancel = mock();
  render(
    <ReferenceForm
      labels={testEditorLabels}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
  const title = screen.getByLabelText(`${testEditorLabels.title} *`);
  fireEvent.change(title, { target: { value: 'Attention is all you need' } });
  return { onSubmit, onCancel, title };
}

describe('ReferenceForm keyboard', () => {
  it('submits on Enter in a field', () => {
    const { onSubmit, title } = setup();

    fireEvent.keyDown(title, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Attention is all you need',
    });
  });

  it('does not submit on the Enter that commits an IME composition', () => {
    const { onSubmit, title } = setup();

    fireEvent.keyDown(title, { key: 'Enter', isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('leaves Enter on the Cancel button to the button', () => {
    const { onSubmit, onCancel } = setup();

    const cancel = screen.getByRole('button', {
      name: testEditorLabels.cancel,
    });
    const claimed = !fireEvent.keyDown(cancel, { key: 'Enter' });

    expect(claimed).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels on Escape', () => {
    const { onCancel, title } = setup();

    fireEvent.keyDown(title, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
