'use client';

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

import { EducationForm } from './education-form';

import type { AdminEducation } from '@/entities/education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

const FORM_ID = 'education-form';

interface EducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminEducation>;
  /**
   * The full entry is loading or its fetch failed. The list row carries no
   * achievements, so the form stays unmounted until this clears.
   */
  isLoadingInitialData?: boolean;
  /** The full-entry fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  onSubmit: (data: EducationFormValues) => void;
  loading?: boolean;
}

export function EducationDialog({
  open,
  onOpenChange,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: EducationDialogProps) {
  const t = useTranslations('dashboard.education');
  // Loading counts as editing before the entry arrives: only "new" reaches
  // here with neither `initialData` nor a pending fetch.
  const isEditing = Boolean(initialData) || isLoadingInitialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the field area scrolls. `min-w-0` is load-bearing: without it the
          editor toolbar's ~990px row sets the flex item's minimum width and
          widens the dialog past its own max-width. */}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
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
            <EducationForm
              formId={FORM_ID}
              initialData={initialData ?? undefined}
              onSubmit={onSubmit}
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
            disabled={loading || isLoadingInitialData || hasLoadError}
          >
            {loading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? t('dialog.saveButton') : t('dialog.createSubmitButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
