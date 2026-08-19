'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { WorkspaceSettingsDialog } from '@/features/notes/workspace-settings';

/**
 * Owns the settings dialog for the whole `/space` shell.
 *
 * The dialog is mounted HERE, once, rather than beside each button that opens
 * it, because there are three of those: the desktop rail, the mobile nav sheet,
 * and the keyboard. Mounting it per trigger would give the rail's copy and the
 * sheet's copy separate open states, and the keyboard would have no copy at all
 * — the rail is `hidden md:flex`, so a phone would have no way in.
 */
const SettingsDialogContext = createContext<{ open: () => void } | null>(null);

export function SpaceSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // `Cmd/Ctrl + ,` — the platform convention for preferences on both
      // macOS and Windows, and the reason this one does NOT check whether the
      // author is typing the way `use-workspace-shortcuts.ts` has to. That
      // hook guards bare `k`, `/` and `b`, which are characters someone might
      // legitimately be writing; a modifier combination is not.
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key !== ',') return;
      // Chrome and Firefox do not bind this, but a browser extension might,
      // and macOS Safari passes it to the app. Claiming it explicitly keeps
      // the behaviour the same everywhere.
      event.preventDefault();
      setIsOpen(true);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <SettingsDialogContext.Provider value={value}>
      {children}
      <WorkspaceSettingsDialog open={isOpen} onOpenChange={setIsOpen} />
    </SettingsDialogContext.Provider>
  );
}

/**
 * Opens the settings dialog.
 *
 * Returns a no-op outside the provider rather than throwing: the triggers that
 * call this are chrome, and a missing provider should cost a dead button rather
 * than an unrenderable route.
 */
export function useSettingsDialog(): { open: () => void } {
  return useContext(SettingsDialogContext) ?? { open: () => {} };
}
