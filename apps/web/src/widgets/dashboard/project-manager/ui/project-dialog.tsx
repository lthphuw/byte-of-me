'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { ProjectForm } from './project-form';
import { ProjectFormLoading } from './project-form-loading';

import type { AdminProject, ProjectFromValues } from '@/entities/project/model';
import { useTagOptions } from '@/entities/tag/query';
import { useTechStackOptions } from '@/entities/tech-stack/query';
import { ContentFade } from '@/shared/ui';
import { QueryState } from '@/shared/ui/query-state';

const FORM_ID = 'project-form';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  initialData,
  isLoadingInitialData = false,
  hasLoadError = false,
  onRetryLoad,
  onSubmit,
  loading,
}: ProjectDialogProps) {
  const t = useTranslations('dashboard.project');
  const tShared = useTranslations('dashboard.shared');
  // Only fetched while the dialog is open, so a closed dialog pays for nothing.
  const tagsRead = useTagOptions(open);
  const techRead = useTechStackOptions(open);
  // Loading counts as editing before the record arrives: only "new" reaches
  // here with neither `initialData` nor a pending fetch.
  const isEditing = Boolean(initialData) || isLoadingInitialData;
  const isReady = !isLoadingInitialData && !hasLoadError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the field area scrolls. `min-w-0` is load-bearing: without it the
          editor toolbar's button row sets the flex item's minimum width and
          widens the dialog past its own max-width. */}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
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
          {/* A dialog has no empty state, so `isEmpty` stays false. */}
          <QueryState
            isLoading={isLoadingInitialData && !hasLoadError}
            isError={hasLoadError}
            isEmpty={false}
            onRetry={() => onRetryLoad?.()}
            skeleton={<ProjectFormLoading />}
            errorTitle={tShared('managerListState.errorTitle')}
            errorDescription={tShared('managerListState.errorDescription')}
            retryLabel={tShared('managerListState.retry')}
            emptyTitle=""
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
              />
            </ContentFade>
          </QueryState>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {t('dialog.cancelButton')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={loading || !isReady}
            className="w-full md:w-auto"
          >
            {loading ? t('dialog.savingButton') : t('dialog.saveButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
