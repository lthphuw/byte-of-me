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

export type QueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  /** Background refetch: the list stays visible and a corner spinner shows. */
  isFetching?: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  /** Same classes as the content it stands in for (AGENTS §14). */
  skeleton: ReactNode;
  errorTitle: string;
  errorDescription: string;
  retryLabel: string;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
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
  children,
}: QueryStateProps) {
  if (isLoading) return <>{skeleton}</>;

  let body: ReactNode = children;

  if (isError) {
    body = (
      <div className="flex justify-center py-20">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{errorTitle}</EmptyTitle>
            <EmptyDescription>{errorDescription}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
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
      {isFetching ? (
        <div className="pointer-events-none absolute right-2 top-2">
          <Loading />
        </div>
      ) : null}
    </>
  );
}
