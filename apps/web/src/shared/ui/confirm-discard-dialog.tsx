'use client';

import { ConfirmDialog } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

interface ConfirmDiscardDialogProps {
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

/**
 * Asked before a dirty form closes. "Keep editing" only closes this prompt.
 * Not destructive: that style is reserved for irreversible deletes.
 */
export function ConfirmDiscardDialog({
  open,
  onClose,
  onDiscard,
}: ConfirmDiscardDialogProps) {
  const t = useTranslations('dashboard.shared.crud');

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onDiscard}
      title={t('discardTitle')}
      description={t('discardDescription')}
      confirmLabel={t('discard')}
      cancelLabel={t('keepEditing')}
    />
  );
}
