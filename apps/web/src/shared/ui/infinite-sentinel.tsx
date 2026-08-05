'use client';

import { useEffect } from 'react';
import { useIntersection } from '@byte-of-me/ui/hooks/use-intersection';

export interface InfiniteSentinelProps {
  /** Whether another page exists. Nothing renders when it does not. */
  hasNextPage: boolean;
  /** True while a page is in flight — guards against a double fetch. */
  isFetching: boolean;
  onLoadMore: () => void;
  /**
   * How far ahead of the viewport to start loading, as a CSS margin. The
   * default begins the request before the reader reaches the end, so a fast
   * scroll does not hit a gap.
   */
  rootMargin?: string;
}

/**
 * The bottom of a paginated list: asks for the next page when it scrolls into
 * view. Shared by the explorer's tree levels, flat list and grouped sections.
 *
 * Built on `packages/ui`'s `useIntersection` rather than a second observer of
 * its own — AGENTS §11.3. That hook reports the latest entry as state; the
 * effect below is what turns "became visible" into a single call.
 */
export function InfiniteSentinel({
  hasNextPage,
  isFetching,
  onLoadMore,
  rootMargin = '200px',
}: InfiniteSentinelProps) {
  const { ref, entry } = useIntersection<HTMLDivElement>({ rootMargin });
  const isVisible = entry?.isIntersecting ?? false;

  useEffect(() => {
    // `isFetching` is in the condition AND the dependencies on purpose: the
    // sentinel stays visible for the whole request, so without the guard the
    // effect would re-fire on every re-render while the page is loading and
    // queue duplicate fetches. Re-running once the request settles is what
    // loads page three when page two did not fill the viewport.
    if (isVisible && hasNextPage && !isFetching) onLoadMore();
  }, [isVisible, hasNextPage, isFetching, onLoadMore]);

  if (!hasNextPage) return null;

  // Height, not a zero-size node: an element with no box never intersects.
  return <div ref={ref} className="h-px w-full shrink-0" aria-hidden />;
}
