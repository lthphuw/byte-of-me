'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { QueryState } from '@/shared/ui/query-state';

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
  /**
   * The loading placeholder, with the classes of the content it stands in for
   * (AGENTS §14). Required: every loading state shows a skeleton.
   */
  skeleton: ReactNode;
  children: ReactNode;
}

/**
 * The standard list body for dashboard managers:
 * loading (skeleton) → error (with retry) → empty (with CTA) → content.
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
  const t = useTranslations('dashboard.shared');

  return (
    <QueryState
      isLoading={isLoading}
      isError={Boolean(isError)}
      isFetching={isFetching}
      isEmpty={isEmpty}
      onRetry={onRetry}
      skeleton={skeleton}
      errorTitle={t('managerListState.errorTitle')}
      errorDescription={t('managerListState.errorDescription')}
      retryLabel={t('managerListState.retry')}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
    >
      {children}
    </QueryState>
  );
}
