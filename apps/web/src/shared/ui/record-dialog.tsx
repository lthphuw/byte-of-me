'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@byte-of-me/ui';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmDiscardDialog } from './confirm-discard-dialog';

import { cn } from '@/shared/lib/utils';

export type RecordDialogSize = 'md' | 'lg' | 'xl';

export interface RecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** The width from `md` up. Below `md` the dialog is always full screen. */
  size?: RecordDialogSize;
  /** The id of the form the Save button submits. */
  formId?: string;
  /** Blocks every close path and shows the spinner on Save. */
  isPending?: boolean;
  /** A close request asks before the form's unsaved changes are dropped. */
  isDirty?: boolean;
  /** Disables the default Save, e.g. while the record is still loading. */
  submitDisabled?: boolean;
  /** No footer at all, for a read-only record. */
  hideFooter?: boolean;
  children: ReactNode;
}

const SIZE_CLASS: Record<RecordDialogSize, string> = {
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-5xl',
};

/**
 * The create and edit surface for every dashboard record. Every close path
 * (close button, Escape, overlay, Cancel) goes through `requestClose`.
 */
export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  formId,
  isPending = false,
  isDirty = false,
  submitDisabled = false,
  hideFooter = false,
  children,
}: RecordDialogProps) {
  const t = useTranslations('dashboard.shared.crud');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const requestClose = () => {
    if (isPending) return;
    if (isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
      >
        <DialogContent
          className={cn(
            'flex max-h-dvh flex-col gap-0 p-0',
            // Below md: full screen. From md: centred, capped at 90dvh.
            'max-md:inset-0 max-md:left-0 max-md:top-0 max-md:h-dvh max-md:w-dvw max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none',
            'md:max-h-[90dvh] md:w-full',
            SIZE_CLASS[size]
          )}
          closeLabel={t('close')}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={(event) => {
            event.preventDefault();
            requestClose();
          }}
        >
          {/* The right padding keeps the title clear of the 44px close button. */}
          <DialogHeader className="shrink-0 border-b py-4 pl-4 pr-14 md:pl-6 md:pr-14">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={description ? undefined : 'sr-only'}>
              {description ?? title}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {children}
          </div>

          {!hideFooter && (
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex md:justify-end md:pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                disabled={isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                form={formId}
                disabled={isPending || submitDisabled}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('save')
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        onDiscard={() => {
          setConfirmingDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
