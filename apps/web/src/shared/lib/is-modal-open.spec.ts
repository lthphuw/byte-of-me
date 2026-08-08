/**
 * `isModalOpen` is what stops a bare-key shortcut firing at the tree behind an
 * open dialog.
 *
 * The contract is narrow and worth stating: only an OPEN dialog counts. Radix
 * leaves a closing/closed `[role="dialog"]` in the DOM through its exit
 * animation, and treating that as open would deaden every shortcut for a
 * couple of hundred milliseconds after each dialog closed.
 */
import { afterEach, describe, expect, it } from 'bun:test';

import { isModalOpen } from './is-modal-open';

function mount(html: string) {
  document.body.innerHTML = html;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isModalOpen', () => {
  it('is false with nothing mounted', () => {
    expect(isModalOpen()).toBe(false);
  });

  it('is true while a dialog is open', () => {
    mount('<div role="dialog" data-state="open"></div>');

    expect(isModalOpen()).toBe(true);
  });

  it('is true while an alert dialog is open', () => {
    // The delete and move confirmations are alertdialogs, not dialogs, and a
    // check that only knew about `dialog` would leave the destructive ones
    // exposed — which is the wrong half to miss.
    mount('<div role="alertdialog" data-state="open"></div>');

    expect(isModalOpen()).toBe(true);
  });

  it('is false once the dialog is closed but still in the DOM', () => {
    mount('<div role="dialog" data-state="closed"></div>');

    expect(isModalOpen()).toBe(false);
  });

  it('ignores a non-dialog element carrying data-state="open"', () => {
    // Radix stamps `data-state` on accordions, dropdown triggers, tooltips and
    // more. Matching on that alone would disable the tree's keys whenever a
    // menu was open, which is exactly when the author is using them.
    mount('<div data-state="open"></div><button data-state="open"></button>');

    expect(isModalOpen()).toBe(false);
  });
});
