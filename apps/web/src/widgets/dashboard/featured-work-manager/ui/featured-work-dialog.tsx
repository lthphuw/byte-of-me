'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icons,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { FeaturedWorkForm } from './featured-work-form';

import type { AdminFeaturedWorkDetail } from '@/entities/featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

const FORM_ID = 'featured-work-form';

interface FeaturedWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Whether this dialog edits an entry. Set from the list row, so the title
   * does not flip to "Add" while the full row is still loading.
   */
  isEditing: boolean;
  /** The full row, loaded by id. Carries each language's body. */
  initialData?: Nullable<AdminFeaturedWorkDetail>;
  /**
   * The full row is loading or its fetch failed. The list row carries no
   * bodies, so the form stays unmounted until this clears.
   */
  isLoadingInitialData?: boolean;
  /** The full-row fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  onSubmit: (data: FeaturedWorkFormValues) => void;
  loading?: boolean;
}

export function FeaturedWorkDialog({
  open,
  onOpenChange,
  isEditing,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: FeaturedWorkDialogProps) {
  const t = useTranslations('dashboard.featuredWorks');
  const [isUploading, setIsUploading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>
            {isEditing ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('dialog.editDescription')
              : t('dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <EditRecordGate
            isNotReady={isLoadingInitialData}
            hasError={hasLoadError}
            onRetry={() => onRetryLoad?.()}
          >
            <FeaturedWorkForm
              formId={FORM_ID}
              initialData={initialData ?? undefined}
              onSubmit={onSubmit}
              onUploadingChange={setIsUploading}
            />
          </EditRecordGate>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('dialog.cancelButton')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={
              loading || isLoadingInitialData || hasLoadError || isUploading
            }
          >
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing
              ? t('dialog.saveButton')
              : t('dialog.createSubmitButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
