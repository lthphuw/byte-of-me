'use client';

import { useState } from 'react';
import type { CompanyFormValues } from '@byte-of-me/contracts/company';
import { useTranslations } from 'next-intl';

import { CompanyForm } from './company-form';
import { CompanyFormLoading } from './company-form-loading';

import type { AdminCompany } from '@/entities/company/model/types';
import { useTechStackOptions } from '@/entities/tech-stack/query';
import { EditRecordDialog, type EditRecordDialogControls } from '@/shared/ui';

const FORM_ID = 'company-form';

interface CompanyDialogProps extends EditRecordDialogControls {
  initialData?: Nullable<AdminCompany>;
  onSubmit: (data: CompanyFormValues) => void;
}

export function CompanyDialog({
  initialData,
  onSubmit,
  ...controls
}: CompanyDialogProps) {
  const t = useTranslations('dashboard.company');
  // Shared with ProjectDialog on purpose — same query key, same mapping. Owned
  // here, not by the form, so the fetch starts with the dialog and runs in
  // parallel with the record the form is gated on.
  const techStacks = useTechStackOptions(controls.open);
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
      skeleton={<CompanyFormLoading />}
    >
      <CompanyForm
        formId={FORM_ID}
        initialData={initialData ?? undefined}
        techStacks={techStacks}
        onSubmit={onSubmit}
        onDirtyChange={setIsDirty}
      />
    </EditRecordDialog>
  );
}
