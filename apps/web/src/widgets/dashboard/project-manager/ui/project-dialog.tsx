'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ProjectForm } from './project-form';
import { ProjectFormLoading } from './project-form-loading';

import type { AdminProject, ProjectFromValues } from '@/entities/project/model';
import { useTagOptions } from '@/entities/tag/query';
import { useTechStackOptions } from '@/entities/tech-stack/query';
import { ContentFade, RecordDialog } from '@/shared/ui';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

const FORM_ID = 'project-form';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set from the list row, so the title does not flip while the record loads. */
  isEditing: boolean;
  initialData?: Nullable<AdminProject>;
  /** The full record is loading or its fetch failed. The form stays unmounted until it arrives. */
  isLoadingInitialData?: boolean;
  /** The full-record fetch failed; the dialog offers `onRetryLoad` instead. */
  hasLoadError?: boolean;
  onRetryLoad?: () => void;
  onSubmit: (values: ProjectFromValues) => void;
  loading: boolean;
}

export function ProjectDialog({
  open,
  onOpenChange,
  isEditing,
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: ProjectDialogProps) {
  const t = useTranslations('dashboard.project');
  const crud = useTranslations('dashboard.shared.crud');
  // Only fetched while the dialog is open, so a closed dialog pays for nothing.
  const tagsRead = useTagOptions(open);
  const techRead = useTechStackOptions(open);
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
      size="xl"
      formId={FORM_ID}
      isPending={loading}
      isDirty={isDirty}
      // Save waits for the full project, as the gate below holds the form back.
      submitDisabled={
        isEditing && (isLoadingInitialData || hasLoadError || !initialData)
      }
    >
      <EditRecordGate
        isNotReady={isLoadingInitialData}
        hasError={hasLoadError}
        onRetry={() => onRetryLoad?.()}
        skeleton={<ProjectFormLoading />}
      >
        <ContentFade>
          <ProjectForm
            formId={FORM_ID}
            initialData={initialData ?? undefined}
            tags={{
              options: tagsRead.tagOptions,
              isLoading: tagsRead.isLoading,
              isError: tagsRead.isError,
              retry: tagsRead.retry,
            }}
            techStacks={{
              options: techRead.options,
              isLoading: techRead.isLoading,
              isError: techRead.isError,
              retry: techRead.refetch,
            }}
            onSubmit={onSubmit}
            onDirtyChange={setIsDirty}
          />
        </ContentFade>
      </EditRecordGate>
    </RecordDialog>
  );
}
