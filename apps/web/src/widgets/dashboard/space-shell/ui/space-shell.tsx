import { SpaceNavRail } from './space-nav-rail';
import { SpaceSettingsProvider } from './space-settings-provider';

import { SkipToContentLink } from '@/shared/ui/skip-to-content-link';

/**
 * The chrome every `/space` page sits inside.
 *
 * `h-dvh` with the content column as its own `min-h-0` flex child, rather than
 * the dashboard's `min-h-screen` + `container py-6` (which stacked a second
 * `p-4 lg:p-10` on top of that until this note's argument was applied there
 * too): a space page is an *app surface*, not a document. That padding cost roughly
 * 80px of vertical space on a phone and forced the notes workspace to guess it
 * back with `h-[calc(100dvh-8rem)]`, which then nested a second scroll
 * container inside the page's own. Here the shell owns the viewport height and
 * each page decides its own padding and scrolling — the notes workspace fills
 * it exactly, with no arithmetic.
 *
 * A future page that wants ordinary document scrolling opts in with its own
 * `flex-1 overflow-y-auto p-4` root.
 *
 * `overflow-x-clip`, not `overflow-hidden`: `hidden` would make this the
 * nearest scroll container for sticky descendants (see the dashboard layout's
 * note on the same line).
 */
export function SpaceShell({ children }: { children: React.ReactNode }) {
  return (
    // The settings dialog is hosted around BOTH the rail and the content, not
    // inside either: the rail opens it, a page's mobile nav sheet opens it, and
    // the keyboard opens it with no trigger on screen at all.
    <SpaceSettingsProvider>
      <div className="flex h-dvh overflow-x-clip bg-muted/40">
        {/* WCAG 2.4.1: the rail is eight controls, re-tabbed on every move
            between notes without this. `PublicHeaderSkipLink` is the same idea
            for the public header, but importing it here would be widget →
            widget, the sideways import AGENTS §3 rules out — so the shape both
            of them want lives in `shared/ui` instead. */}
        <SkipToContentLink targetId="space-content" />

        <SpaceNavRail />

        <div
          id="space-content"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          {children}
        </div>
      </div>
    </SpaceSettingsProvider>
  );
}
