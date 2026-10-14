'use client';

import type { ReactNode } from 'react';
import { Button } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { StateBlock } from './state-block';

interface EditRecordGateProps {
  /** The full record has not arrived: loading, or never requested. */
  isNotReady: boolean;
  hasError: boolean;
  onRetry: () => void;
  /** The form's own skeleton, shown while the record loads. */
  skeleton: ReactNode;
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
  skeleton,
  children,
}: EditRecordGateProps) {
  const t = useTranslations('dashboard.shared.managerListState');

  if (hasError) {
    return (
      <StateBlock
        role="alert"
        title={t('errorTitle')}
        description={t('errorDescription')}
        action={
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {t('retry')}
          </Button>
        }
      />
    );
  }

  if (isNotReady) return skeleton;

  return children;
}
