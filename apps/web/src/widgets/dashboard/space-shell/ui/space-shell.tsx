import { SpaceNavRail } from './space-nav-rail';

/**
 * The chrome every `/space` page sits inside.
 *
 * `h-dvh` with the content column as its own `min-h-0` flex child, rather than
 * the dashboard's `min-h-screen` + `container py-6` + `p-4 lg:p-10`: a space
 * page is an *app surface*, not a document. The old padding stack cost roughly
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
    <div className="flex h-dvh overflow-x-clip bg-muted/40">
      <SpaceNavRail />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
