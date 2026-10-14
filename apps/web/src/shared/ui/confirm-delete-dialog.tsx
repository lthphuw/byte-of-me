'use client';

import { ConfirmDialog } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

type ConfirmDeleteDialogProps = Omit<
  React.ComponentProps<typeof ConfirmDialog>,
  'destructive' | 'confirmLabel' | 'cancelLabel'
>;

/** Asked before a record or a field is deleted for good. */
export function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  const t = useTranslations('dashboard.shared.confirmDelete');

  return (
    <ConfirmDialog
      {...props}
      destructive
      confirmLabel={t('actionText')}
      cancelLabel={t('cancelText')}
    />
  );
}
