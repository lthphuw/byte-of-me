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
  /** Optional skeleton shown while loading; defaults to a centered spinner. */
  skeleton?: ReactNode;
  children: ReactNode;
}

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
  skeleton,
  children,
}: ManagerListStateProps) {
  if (isLoading) {
    return (
      skeleton ?? (
        <div className="flex justify-center py-20">
          <Loading />
        </div>
      )
    );
  }

  if (isError) {
    return (
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
  }

  if (isEmpty) {
    return (
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

  return <>{children}</>;
}
