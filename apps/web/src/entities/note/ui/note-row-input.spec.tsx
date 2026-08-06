/**
 * The tree row that is currently a text field — a new note being named, or a
 * rename in place.
 *
 * It has TWO ways to finish, Enter and blur, and the contract that matters is
 * that they never both run. That is not a theoretical concern: driving the real
 * app, one Enter produced two `createNote` calls and two notes with the same
 * name, because committing unmounts the input and removing a focused element
 * fires `blur`.
 *
 * Tested here rather than through the panel on purpose. React removes the input
 * the moment the draft clears, so by the time a panel-level test could dispatch
 * the blur there is no mounted node left to dispatch it on — the assertion
 * passes whether or not the guard exists, which is worse than no test. Rendering
 * this component directly, with a callback that does NOT unmount it, reproduces
 * the browser's ordering exactly.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, mock, test } from 'bun:test';

import { NoteRowInput } from './note-row-input';

afterEach(cleanup);

function setup(defaultValue = '') {
  const onSubmit = mock((_value: string) => {});
  const onCancel = mock(() => {});
  render(
    <NoteRowInput
      depth={1}
      isFolder={false}
      defaultValue={defaultValue}
      label="New note name"
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
  return {
    input: screen.getByLabelText('New note name') as HTMLInputElement,
    onSubmit,
    onCancel,
  };
}

describe('NoteRowInput', () => {
  test('commits once on Enter, and the blur behind it does not commit again', () => {
    const { input, onSubmit } = setup();
    fireEvent.change(input, { target: { value: 'Once' } });

    fireEvent.keyDown(input, { key: 'Enter' });
    // What the browser does next when the committed row is removed.
    fireEvent.blur(input);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Once');
  });

  test('Escape cancels, and the blur behind it does not save the rejected text', () => {
    const { input, onSubmit, onCancel } = setup('Original');
    fireEvent.change(input, { target: { value: 'Rejected' } });

    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(onCancel).toHaveBeenCalledTimes(1);
    // The point of Escape: nothing is written, not even by the blur that
    // follows focus moving away.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('blur alone commits — clicking away is a save, as in VSCode', () => {
    const { input, onSubmit } = setup();
    fireEvent.change(input, { target: { value: 'Typed then clicked away' } });

    fireEvent.blur(input);

    expect(onSubmit).toHaveBeenCalledWith('Typed then clicked away');
  });

  test('seeds a rename with the current name, selected for overtyping', () => {
    const { input } = setup('Sprint plan');

    expect(input.value).toBe('Sprint plan');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Sprint plan'.length);
  });

  test('keeps its own keystrokes away from the tree bindings', () => {
    const { input } = setup();
    // `n`, `Delete` and the arrows all mean something to the panel's key
    // handler. While a name is being typed they must mean only what they mean
    // in a text field, which is why every unhandled key stops here.
    const typed = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    let reachedParent = false;
    document.body.addEventListener('keydown', () => {
      reachedParent = true;
    });

    input.dispatchEvent(typed);

    expect(reachedParent).toBe(false);
  });
});
