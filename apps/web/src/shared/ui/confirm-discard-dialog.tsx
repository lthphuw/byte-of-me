'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

export interface ConfirmDiscardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

/** Asked before a dirty form closes. "Keep editing" only closes this prompt. */
export function ConfirmDiscardDialog({
  open,
  onOpenChange,
  onDiscard,
}: ConfirmDiscardDialogProps) {
  const t = useTranslations('dashboard.shared.crud');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('discardTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('discardDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('keepEditing')}</AlertDialogCancel>
          {/* Not destructive: spec 4.5 reserves that style for irreversible deletes. */}
          <AlertDialogAction onClick={onDiscard}>
            {t('discard')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
