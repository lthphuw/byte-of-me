'use client';

import type { ReactNode } from 'react';
import { Button, Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

interface EditRecordGateProps {
  /** The full record has not arrived: loading, or never requested. */
  isNotReady: boolean;
  hasError: boolean;
  onRetry: () => void;
  /** The form. Rendered only once the record is in hand. */
  children: ReactNode;
}

/**
 * Holds an edit form back until the record it seeds from has loaded: a skeleton
 * while pending, an error with Retry on failure. Never the form on a partial row.
 */
export function EditRecordGate({
  isNotReady,
  hasError,
  onRetry,
  children,
}: EditRecordGateProps) {
  const t = useTranslations('dashboard.shared.managerListState');

  if (hasError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <p className="text-sm text-muted-foreground">{t('errorTitle')}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (isNotReady) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t('loading')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return children;
}
