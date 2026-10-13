'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { EducationForm } from './education-form';
import { EducationFormLoading } from './education-form-loading';

import type { AdminEducation } from '@/entities/education';
import type { EducationFormValues } from '@/entities/education/model/education-schema';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';
import { RecordDialog } from '@/shared/ui/record-dialog';

const FORM_ID = 'education-form';

interface EducationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set from the list row, so the title does not flip while the entry loads. */
  isEditing: boolean;
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
  isEditing,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: EducationDialogProps) {
  const t = useTranslations('dashboard.education');
  const tCrud = useTranslations('dashboard.shared.crud');
  const [isDirty, setIsDirty] = useState(false);

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing
          ? tCrud('editTitle', { entity: t('entity') })
          : tCrud('newTitle', { entity: t('entity') })
      }
      description={
        isEditing ? t('dialog.editDescription') : t('dialog.createDescription')
      }
      size="xl"
      formId={FORM_ID}
      isPending={loading}
      isDirty={isDirty}
      // Save waits for the full entry, as the gate below holds the form back.
      submitDisabled={
        isEditing && (isLoadingInitialData || hasLoadError || !initialData)
      }
    >
      <EditRecordGate
        isNotReady={isLoadingInitialData}
        hasError={hasLoadError}
        onRetry={() => onRetryLoad?.()}
        skeleton={<EducationFormLoading />}
      >
        <EducationForm
          formId={FORM_ID}
          initialData={initialData ?? undefined}
          onSubmit={onSubmit}
          onDirtyChange={setIsDirty}
        />
      </EditRecordGate>
    </RecordDialog>
  );
}
