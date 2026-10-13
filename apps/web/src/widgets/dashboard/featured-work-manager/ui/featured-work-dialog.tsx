'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { FeaturedWorkForm } from './featured-work-form';
import { FeaturedWorkFormLoading } from './featured-work-form-loading';

import type {
  AdminFeaturedWorkDetail,
  FeaturedWorkFormValues,
} from '@/entities/featured-work/model';
import { ContentFade, RecordDialog } from '@/shared/ui';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

const FORM_ID = 'featured-work-form';

interface FeaturedWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Whether this dialog edits an entry. Set from the list row, so the title
   * does not flip to "New" while the full row is still loading.
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
  const crud = useTranslations('dashboard.shared.crud');
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={crud(isEditing ? 'editTitle' : 'newTitle', {
        entity: t('entity'),
      })}
      description={
        isEditing ? t('dialog.editDescription') : t('dialog.createDescription')
      }
      size="lg"
      formId={FORM_ID}
      // A clip in flight holds Save and closing, like a save in progress.
      isPending={loading || isUploading}
      isDirty={isDirty}
      // Save waits for the full row, as the gate below holds the form back.
      submitDisabled={
        isEditing && (isLoadingInitialData || hasLoadError || !initialData)
      }
    >
      <EditRecordGate
        isNotReady={isLoadingInitialData}
        hasError={hasLoadError}
        onRetry={() => onRetryLoad?.()}
        skeleton={<FeaturedWorkFormLoading />}
      >
        <ContentFade>
          <FeaturedWorkForm
            formId={FORM_ID}
            initialData={initialData ?? undefined}
            onSubmit={onSubmit}
            onUploadingChange={setIsUploading}
            onDirtyChange={setIsDirty}
          />
        </ContentFade>
      </EditRecordGate>
    </RecordDialog>
  );
}
