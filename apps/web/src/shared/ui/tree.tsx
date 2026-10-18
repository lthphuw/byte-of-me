import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

export type TreeTone = 'merged' | 'primary';

// A parent's tree: a trunk on the logo's axis, a rounded branch per child, a node at its end.
// The `group/tree` wrapper sets CSS variables: `--tx` trunk x, `--r` curve radius, `--nx` node
// left, `--cy` a row's first-line centre (px, or 50%), `--stub-top` where the trunk leaves the header.
// Lines are `muted-foreground/45`: `--border` (about 1.5:1) made the branches read as disconnected.
const TRUNK =
  'before:absolute before:left-[var(--tx)] before:top-0 before:h-[calc(var(--cy)-var(--r))] before:w-px before:bg-muted-foreground/45 before:transition-colors before:duration-150';
// The trunk runs through every junction and a branch is only its curve: a branch that carried its
// own vertical left a gap in the trunk at each one, and the children looked apart.
const BRANCH =
  'after:absolute after:left-[var(--tx)] after:top-[calc(var(--cy)-var(--r))] after:h-[var(--r)] after:w-[calc(var(--nx)-var(--tx))] after:rounded-bl-[var(--r)] after:border-b after:border-l after:border-muted-foreground/45 after:transition-colors after:duration-150';
const TRUNK_BELOW =
  'absolute bottom-0 left-[var(--tx)] top-[calc(var(--cy)-var(--r))] w-px bg-muted-foreground/45 transition-colors duration-150';

/** A node sits at the end of a branch; the caller adds its colour. */
export const TREE_NODE =
  'absolute left-[var(--nx)] top-[calc(var(--cy)-0.5rem)] size-4';

// A row that folds: its height goes 0fr -> 1fr with `group/fold`'s `data-fold` (see the
// achievement fold). `inherit` when open, so a closed Details region still hides it.
const FOLD =
  'grid grid-rows-[0fr] invisible transition-[grid-template-rows,visibility] duration-200 ease-exit group-data-[fold=open]/fold:grid-rows-[1fr] group-data-[fold=open]/fold:[visibility:inherit] group-data-[fold=open]/fold:duration-250 group-data-[fold=open]/fold:ease-enter motion-reduce:[transition-property:visibility]';

// Hover lights the path from the parent to that node in one colour: every row above (a later row
// hovered), this row's trunk and branch; the rows below stay grey. Needs `can-hover:` for `:has`.
const LIT: Record<
  TreeTone,
  { self: string; above: string; below: string; stub: string; rail: string }
> = {
  merged: {
    self: 'hover:before:bg-merged hover:after:border-merged',
    above: 'can-hover:has-[~li:hover]:before:bg-merged',
    below: 'can-hover:group-has-[~li:hover]/pr:bg-merged',
    stub: 'can-hover:group-has-[li:hover]/tree:bg-merged',
    rail: 'can-hover:group-has-[li:hover]/tree:before:bg-merged',
  },
  primary: {
    self: 'hover:before:bg-primary hover:after:border-primary',
    above: 'can-hover:has-[~li:hover]:before:bg-primary',
    below: 'can-hover:group-has-[~li:hover]/pr:bg-primary',
    stub: 'can-hover:group-has-[li:hover]/tree:bg-primary',
    rail: 'can-hover:group-has-[li:hover]/tree:before:bg-primary',
  },
};

const delayVar = (ms: number) =>
  ({ '--tree-delay': `${ms}ms` }) as CSSProperties;

/**
 * One child of the tree. `through` when another row follows, so the trunk goes on below it;
 * `dashed` for the "more" row; `fold` for a row that collapses with the fold's state. `className`
 * is the row's padding (on the inner box for a folding row, which has none of its own).
 */
export function TreeItem({
  tone,
  through = false,
  dashed = false,
  fold = false,
  className,
  children,
}: {
  tone: TreeTone;
  through?: boolean;
  dashed?: boolean;
  fold?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        'group/pr relative',
        BRANCH,
        TRUNK,
        dashed && 'after:border-dashed',
        LIT[tone].self,
        LIT[tone].above,
        fold ? 'overflow-clip' : className
      )}
    >
      {through && <span aria-hidden className={cn(TRUNK_BELOW, LIT[tone].below)} />}
      {fold ? (
        <div className={FOLD}>
          <div className="min-h-0 min-w-0">
            <div className={className}>{children}</div>
          </div>
        </div>
      ) : (
        children
      )}
    </li>
  );
}

/** The trunk from just under the parent's logo to the first row; Details only. */
export function TreeStub({ tone, delay }: { tone: TreeTone; delay: number }) {
  return (
    <span
      aria-hidden
      style={delayVar(delay)}
      className="pointer-events-none absolute bottom-0 left-[var(--tx)] top-[var(--stub-top)] w-px opacity-0 transition-opacity duration-200 ease-exit group-data-[view=details]/view:opacity-100 group-data-[view=details]/view:duration-250 group-data-[view=details]/view:ease-enter group-data-[view=details]/view:[transition-delay:var(--tree-delay)]"
    >
      {/* The fade and the colour are two elements: the colour keeps the 150ms every segment uses. */}
      <span
        className={cn(
          'block h-full w-px bg-muted-foreground/45 transition-colors duration-150',
          LIT[tone].stub
        )}
      />
    </span>
  );
}

/** A block between the header and the rows (a description) that the trunk runs alongside. */
export function TreeRail({
  tone,
  className,
  children,
}: {
  tone: TreeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative before:absolute before:inset-y-0 before:left-[var(--tx)] before:w-px before:bg-muted-foreground/45 before:transition-colors before:duration-150',
        LIT[tone].rail,
        className
      )}
    >
      {children}
    </div>
  );
}
