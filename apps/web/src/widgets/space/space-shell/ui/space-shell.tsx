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
 *
 * Safe-area insets: the outer row carries the LEFT/RIGHT ones, once, so
 * whichever child is currently flush with the device edge — the rail on
 * desktop, `#space-content` itself below `lg` where the rail is hidden —
 * inherits it for free. `#space-content` carries TOP/BOTTOM itself, because
 * that is the one that actually reaches those edges; the rail handles its own
 * bottom in `space-nav-rail.tsx`, where its `py-3` already had a value worth
 * keeping.
 *
 * `#space-content`'s inset is a bare `env()` with no floor — unlike the
 * `max(0.5rem, env(...))` bottom bars elsewhere in `/space/health`, this is a
 * structural gutter, not a touch target, and it stacks with whatever padding
 * a page already renders. Those bottom bars (`health-hub.tsx`,
 * `exercise-catalog.tsx`, `routine-manager.tsx`, `workout-live-logger.tsx`)
 * dropped their own `env()` in favour of this one: with both, the inset was
 * being applied twice — once shrinking this column, once again inside their
 * own floor — leaving an empty band between the bar and the true edge.
 */
export function SpaceShell({ children }: { children: React.ReactNode }) {
  return (
    // The settings dialog is hosted around BOTH the rail and the content, not
    // inside either: the rail opens it, a page's mobile nav sheet opens it, and
    // the keyboard opens it with no trigger on screen at all.
    <SpaceSettingsProvider>
      <div
        className="flex h-dvh overflow-x-clip bg-muted/40"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
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
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {children}
        </div>
      </div>
    </SpaceSettingsProvider>
  );
}
