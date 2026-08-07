'use client';

import { useEffect } from 'react';

interface WorkspaceShortcuts {
  /** True while the search palette is open — the Cmd+K binding needs to know. */
  searchOpen: boolean;
  onOpenSearch: () => void;
  onOpenCheatSheet: () => void;
  onToggleSidebar: () => void;
}

/** Anything that swallows keystrokes as text: an input, a textarea, or
 *  anywhere inside a contenteditable region (`isContentEditable` is inherited,
 *  so this is true for the nodes *inside* the rich-text editor too, not just
 *  its root). */
function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA')
  );
}

/**
 * The three page-wide shortcuts: Cmd/Ctrl+K, Cmd/Ctrl+/ and Cmd/Ctrl+B.
 *
 * All three are bound on `document` because they must work wherever focus is,
 * including inside the editor. The tree's own bindings are the opposite — bare
 * keys, deliberately scoped to explorer focus (see `useTreeKeyboard`).
 *
 * One effect rather than three: the handlers are mutually exclusive on `key`,
 * and three listeners on `document` for one keystroke each is three times the
 * work per key the author types anywhere on the page.
 */
export function useWorkspaceShortcuts({
  searchOpen,
  onOpenSearch,
  onOpenCheatSheet,
  onToggleSidebar,
}: WorkspaceShortcuts) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      // `.toLowerCase()`, not a literal: `event.key` is uppercase with Shift
      // held or CapsLock on, and a strict `=== 'k'` silently missed both.
      const key = event.key.toLowerCase();

      if (key === 'k') {
        // Already open: do nothing, rather than toggling closed. cmdk's own
        // `Command` root binds Ctrl+K to move its selection cursor while focus
        // is inside it, which is exactly where focus sits whenever the palette
        // is open — so the same keystroke used to both navigate cmdk's list AND
        // close the dialog out from under it. Leaving this one-way lets cmdk
        // have the keystroke; Escape (radix's own binding) still closes it.
        if (searchOpen) return;

        // Ctrl+K — NOT Cmd+K — is a native "kill to end of line" binding some
        // browsers honour inside a text field (notably macOS, inside plain
        // inputs and contenteditable regions alike). Cmd+K has no native
        // text-field binding anywhere and is the canonical palette shortcut, so
        // it must keep working regardless of where focus is: the note title
        // input and the rich-text body hold focus for essentially the whole
        // time a note is open, which is exactly where an author would press it.
        // Bailing out for BOTH modifiers over an editable target — an earlier
        // fix — left Cmd+K dead in that one place and handed the keystroke to
        // the browser instead (Chrome on macOS focuses the omnibox).
        if (event.ctrlKey && !event.metaKey && isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        onOpenSearch();
        return;
      }

      // `/` needs no editable-target carve-out: it has no native text-field
      // binding under either modifier, and nothing in the app claims it.
      if (key === '/') {
        event.preventDefault();
        onOpenCheatSheet();
        return;
      }

      if (key === 'b') {
        // Cmd/Ctrl+B is BOLD inside the rich-text editor, and that binding
        // wins wherever text is being typed. Tiptap handles the keystroke on
        // the editor's own DOM node, which is below this listener in the
        // bubble path — so both fired for one press: the word went bold AND
        // the explorer collapsed out from under the author. `preventDefault`
        // here cannot undo the bold that already happened; only declining the
        // key can. Everywhere else on the page it still toggles the sidebar,
        // which is the only place that toggle has no competitor.
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        onToggleSidebar();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, onOpenSearch, onOpenCheatSheet, onToggleSidebar]);
}
