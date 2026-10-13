'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { CompanyForm } from './company-form';
import { CompanyFormLoading } from './company-form-loading';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import type { AdminCompany } from '@/entities/company/model/types';
import { useTechStackOptions } from '@/entities/tech-stack/query';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';
import { RecordDialog } from '@/shared/ui/record-dialog';

const FORM_ID = 'company-form';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminCompany>;
  /**
   * The full record is loading or its fetch failed. The list row carries no
   * roles or tasks, so the form stays unmounted until this clears.
   */
  isLoadingInitialData?: boolean;
  /** The full-record fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  onSubmit: (data: CompanyFormValues) => void;
  loading?: boolean;
}

export function CompanyDialog({
  open,
  onOpenChange,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: CompanyDialogProps) {
  const t = useTranslations('dashboard.company');
  const tCrud = useTranslations('dashboard.shared.crud');
  // Shared with ProjectDialog on purpose — same query key, same mapping. Owned
  // here, not by the form, so the fetch starts with the dialog and runs in
  // parallel with the record the form is gated on.
  const techStacks = useTechStackOptions(open);
  const [isDirty, setIsDirty] = useState(false);
  // Loading counts as editing before the record arrives: only "new" reaches
  // here with neither `initialData` nor a pending fetch.
  const isEditing = Boolean(initialData) || isLoadingInitialData;

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
    >
      <EditRecordGate
        isNotReady={isLoadingInitialData}
        hasError={hasLoadError}
        onRetry={() => onRetryLoad?.()}
        skeleton={<CompanyFormLoading />}
      >
        <CompanyForm
          formId={FORM_ID}
          initialData={initialData ?? undefined}
          techStacks={techStacks}
          onSubmit={onSubmit}
          onDirtyChange={setIsDirty}
        />
      </EditRecordGate>
    </RecordDialog>
  );
}
