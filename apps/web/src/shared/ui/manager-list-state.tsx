'use client';

import type { ReactNode } from 'react';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Loading,
} from '@byte-of-me/ui';

export interface ManagerListStateProps {
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /**
   * Background refetch (e.g. paging through a placeholder-kept list). Renders
   * the standard corner spinner — the host must be `relative` for it to land.
   */
  isFetching?: boolean;
  /** Optional skeleton shown while loading; defaults to the standard one. */
  skeleton?: ReactNode;
  children: ReactNode;
}

/** Default loading body — the block every manager used to hand-write. */
const DEFAULT_SKELETON = (
  <div className="flex h-64 flex-col items-center justify-center gap-3">
    <Loading />
    <p className="animate-pulse text-xs text-muted-foreground">Loading…</p>
  </div>
);

/**
 * The standard list body for dashboard managers:
 * loading → error (with retry) → empty (with CTA) → content.
 */
export function ManagerListState({
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  isFetching,
  skeleton,
  children,
}: ManagerListStateProps) {
  if (isLoading) {
    return skeleton ?? DEFAULT_SKELETON;
  }

  // Only meaningful once the first page has painted; while `isLoading` the
  // skeleton already says the list is busy.
  const refetchSpinner = isFetching ? (
    <div className="pointer-events-none absolute right-2 top-2">
      <Loading />
    </div>
  ) : null;

  let body: ReactNode = children;

  if (isError) {
    body = (
      <div className="flex justify-center py-20">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>
              The list could not be loaded. Please try again.
            </EmptyDescription>
          </EmptyHeader>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Empty>
      </div>
    );
  } else if (isEmpty) {
    body = (
      <div className="flex justify-center py-20">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            {emptyDescription && (
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            )}
          </EmptyHeader>
          {emptyAction}
        </Empty>
      </div>
    );
  }

  return (
    <>
      {body}
      {refetchSpinner}
    </>
  );
}
