'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { CompanyForm } from './company-form';

import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import type { AdminCompany } from '@/entities/company/model/types';
import { useTechStackOptions } from '@/features/dashboard/tech-stack-management';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

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
  // Shared with ProjectDialog on purpose — same query key, same mapping. Owned
  // here, not by the form, so the fetch starts with the dialog and runs in
  // parallel with the record the form is gated on.
  const techStacks = useTechStackOptions(open);
  // Loading counts as editing before the record arrives: only "new" reaches
  // here with neither `initialData` nor a pending fetch.
  const isEditing = Boolean(initialData) || isLoadingInitialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('dialog.editDescription')
              : t('dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <EditRecordGate
          isNotReady={isLoadingInitialData}
          hasError={hasLoadError}
          onRetry={() => onRetryLoad?.()}
        >
          <CompanyForm
            initialData={initialData ?? undefined}
            techStacks={techStacks}
            onSubmit={onSubmit}
            loading={loading}
          />
        </EditRecordGate>
      </DialogContent>
    </Dialog>
  );
}
