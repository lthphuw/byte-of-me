'use client';

import { type ReactNode, useState } from 'react';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Loading,
} from '@byte-of-me/ui';

import { ContentFade } from './content-fade';

export type QueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  /** Background refetch: the list stays visible and a corner spinner shows. */
  isFetching?: boolean;
  isEmpty: boolean;
  /** Shows the Retry button only when given. */
  onRetry?: () => void;
  /** Same classes as the content it stands in for (AGENTS §14). */
  skeleton: ReactNode;
  errorTitle: string;
  errorDescription: string;
  retryLabel: string;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Shown under the content and in the empty state, never while loading or failed. */
  pagination?: ReactNode;
  children: ReactNode;
};

/**
 * The list body for a query: skeleton while loading, error with retry, empty
 * state, then content. The caller passes every string, so each surface keeps
 * its own next-intl namespace.
 */
export function QueryState({
  isLoading,
  isError,
  isFetching,
  isEmpty,
  onRetry,
  skeleton,
  errorTitle,
  errorDescription,
  retryLabel,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pagination,
  children,
}: QueryStateProps) {
  // Once a skeleton has shown, the content that replaces it fades in. Content
  // hydrated from the server never starts at opacity 0: that delays LCP.
  const [afterSkeleton, setAfterSkeleton] = useState(isLoading);
  if (isLoading && !afterSkeleton) setAfterSkeleton(true);

  if (isLoading) return <>{skeleton}</>;

  let body: ReactNode = (
    <>
      {children}
      {pagination}
    </>
  );

  if (isError) {
    body = (
      <div className="flex justify-center py-20">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{errorTitle}</EmptyTitle>
            <EmptyDescription>{errorDescription}</EmptyDescription>
          </EmptyHeader>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}
        </Empty>
      </div>
    );
  } else if (isEmpty) {
    body = (
      <>
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
        {pagination}
      </>
    );
  }

  return (
    <>
      {afterSkeleton ? <ContentFade>{body}</ContentFade> : body}
      {isFetching ? (
        <div className="pointer-events-none absolute right-2 top-2">
          <Loading />
        </div>
      ) : null}
    </>
  );
}
