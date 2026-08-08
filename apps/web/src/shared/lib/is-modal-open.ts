'use client';

/**
 * Whether a modal dialog is currently open anywhere on the page.
 *
 * Bare-key shortcuts must decline while one is: the author's attention — and
 * their keystrokes — belong to the dialog, not to whatever is behind it.
 *
 * A focus trap is NOT enough on its own, which is what makes this necessary
 * rather than defensive. Radix returns focus to a menu's trigger when the menu
 * closes, and the trigger for the note menu lives INSIDE the tree's scroller —
 * so opening a dialog from that menu leaves focus on an element whose keydowns
 * still bubble into the tree's handler. Pressing Delete with the share dialog
 * open archived the folder behind it, cascade and all.
 *
 * Matched on the ARIA role plus `data-state`, not on `data-state` alone: Radix
 * stamps that attribute on accordions, dropdown triggers and tooltips too, and
 * matching it everywhere would deaden the tree's keys whenever a menu was
 * open — precisely when the author is reaching for them. And on `open` rather
 * than mere presence, because a dialog stays mounted through its exit
 * animation and would otherwise keep the shortcuts dead after it had gone.
 */
export function isModalOpen(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
    ) !== null
  );
}
