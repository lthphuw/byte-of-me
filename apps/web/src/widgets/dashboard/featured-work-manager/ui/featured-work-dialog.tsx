'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { FeaturedWorkForm } from './featured-work-form';
import { FeaturedWorkFormLoading } from './featured-work-form-loading';

import type {
  AdminFeaturedWorkDetail,
  FeaturedWorkFormValues,
} from '@/entities/featured-work/model';
import {
  ContentFade,
  EditRecordDialog,
  type EditRecordDialogControls,
} from '@/shared/ui';

const FORM_ID = 'featured-work-form';

interface FeaturedWorkDialogProps extends EditRecordDialogControls {
  /** The full row, loaded by id. Carries each language's body. */
  initialData?: Nullable<AdminFeaturedWorkDetail>;
  onSubmit: (data: FeaturedWorkFormValues) => void;
}

export function FeaturedWorkDialog({
  initialData,
  onSubmit,
  loading,
  ...controls
}: FeaturedWorkDialogProps) {
  const t = useTranslations('dashboard.featuredWorks');
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <EditRecordDialog
      {...controls}
      entity={t('entity')}
      editDescription={t('dialog.editDescription')}
      createDescription={t('dialog.createDescription')}
      size="xl"
      formId={FORM_ID}
      // A clip in flight holds Save and closing, like a save in progress.
      loading={loading || isUploading}
      isDirty={isDirty}
      hasRecord={Boolean(initialData)}
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
    </EditRecordDialog>
  );
}
