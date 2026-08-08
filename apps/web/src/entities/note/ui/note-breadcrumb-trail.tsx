'use client';

import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@byte-of-me/ui';

import type { NoteAncestor } from '@/entities/note/model/types';
import { cn } from '@/shared/lib/utils';

/** Beyond this, the middle of the path collapses to an ellipsis. */
const MAX_CRUMBS = 3;

interface NoteBreadcrumbTrailProps {
  /** Root first, nearest folder last — the order both walks return. */
  ancestors: NoteAncestor[];
  ariaLabel: string;
  /**
   * How one crumb becomes something to press.
   *
   * Injected because the two surfaces navigate differently and neither should
   * learn the other's way: the owner's crumb SELECTS a folder in a tree that
   * is already on screen, so it is a button; the recipient's crumb is a route
   * change, so it is a link. Everything else about the trail — the
   * truncation, where the ellipsis sits, the separators — is identical, and
   * is what this component exists to stop being written twice.
   */
  renderCrumb: (ancestor: NoteAncestor) => React.ReactNode;
  className?: string;
}

/**
 * A note's path, drawn.
 *
 * Presentational: it is handed the chain and a way to render one rung, and
 * decides only how many of them fit. Which chain — the owner's full ancestry,
 * or a recipient's chain bounded at the share root — is the caller's business
 * and stays there.
 *
 * `BreadcrumbSeparator` is an `<li>`, like `BreadcrumbItem`, so separators are
 * SIBLINGS of the items and never nested inside them. Nesting them produced
 * `<li>` inside `<li>` and a React key warning.
 */
export function NoteBreadcrumbTrail({
  ancestors,
  ariaLabel,
  renderCrumb,
  className,
}: NoteBreadcrumbTrailProps) {
  // Nothing at all for a root-level note. An empty crumb bar is a row of
  // padding saying "this note is not anywhere", and in a young workspace most
  // notes are at the root.
  if (ancestors.length === 0) return null;

  // Keep the FIRST and the last two: the root anchors the path and the
  // nearest folders are what the reader is actually in. The middle is what a
  // deep path can afford to lose.
  const isTruncated = ancestors.length > MAX_CRUMBS;
  const shown: NoteAncestor[] = isTruncated
    ? [ancestors[0] as NoteAncestor, ...ancestors.slice(-2)]
    : ancestors;

  return (
    <Breadcrumb aria-label={ariaLabel} className={cn('shrink-0', className)}>
      <BreadcrumbList className="gap-1 text-xs sm:gap-1">
        {shown.map((ancestor, index) => (
          <Fragment key={ancestor.id}>
            {index > 0 && <BreadcrumbSeparator />}

            {/* The ellipsis stands where the dropped crumbs were: after the
                root, before the tail. */}
            {isTruncated && index === 1 && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbEllipsis className="size-4" />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}

            <BreadcrumbItem>{renderCrumb(ancestor)}</BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** The crumb's own look, shared so the two surfaces cannot drift apart. */
export const NOTE_CRUMB_CLASS =
  'max-w-[12ch] truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-[20ch]';
