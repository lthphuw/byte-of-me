'use client';

import { useState } from 'react';
import type { EducationFormValues } from '@byte-of-me/contracts/education';
import { useTranslations } from 'next-intl';

import { EducationForm } from './education-form';
import { EducationFormLoading } from './education-form-loading';

import type { AdminEducation } from '@/entities/education';
import { EditRecordDialog, type EditRecordDialogControls } from '@/shared/ui';

const FORM_ID = 'education-form';

interface EducationDialogProps extends EditRecordDialogControls {
  initialData?: Nullable<AdminEducation>;
  onSubmit: (data: EducationFormValues) => void;
}

export function EducationDialog({
  initialData,
  onSubmit,
  ...controls
}: EducationDialogProps) {
  const t = useTranslations('dashboard.education');
  const [isDirty, setIsDirty] = useState(false);

  return (
    <EditRecordDialog
      {...controls}
      entity={t('entity')}
      editDescription={t('dialog.editDescription')}
      createDescription={t('dialog.createDescription')}
      size="xl"
      formId={FORM_ID}
      isDirty={isDirty}
      hasRecord={Boolean(initialData)}
      skeleton={<EducationFormLoading />}
    >
      <EducationForm
        formId={FORM_ID}
        initialData={initialData ?? undefined}
        onSubmit={onSubmit}
        onDirtyChange={setIsDirty}
      />
    </EditRecordDialog>
  );
}
