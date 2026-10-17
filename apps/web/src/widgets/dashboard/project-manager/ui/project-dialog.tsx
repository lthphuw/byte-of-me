'use client';

import { useState } from 'react';
import type { ProjectFromValues } from '@byte-of-me/contracts/project';
import { useTranslations } from 'next-intl';

import { ProjectForm } from './project-form';
import { ProjectFormLoading } from './project-form-loading';

import type { AdminProject } from '@/entities/project/model';
import { useTagOptions } from '@/entities/tag/query';
import { useTechStackOptions } from '@/entities/tech-stack/query';
import {
  ContentFade,
  EditRecordDialog,
  type EditRecordDialogControls,
} from '@/shared/ui';

const FORM_ID = 'project-form';

interface ProjectDialogProps extends EditRecordDialogControls {
  initialData?: Nullable<AdminProject>;
  onSubmit: (values: ProjectFromValues) => void;
}

export function ProjectDialog({
  initialData,
  onSubmit,
  ...controls
}: ProjectDialogProps) {
  const t = useTranslations('dashboard.project');
  // Only fetched while the dialog is open, so a closed dialog pays for nothing.
  const tagsRead = useTagOptions(controls.open);
  const techRead = useTechStackOptions(controls.open);
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
    </EditRecordDialog>
  );
}
