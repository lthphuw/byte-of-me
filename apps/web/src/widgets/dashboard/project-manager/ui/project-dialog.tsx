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

import type {
  AdminProject,
  ProjectFromValues,
} from '@/entities/project/model';
import { useProjectReferenceOptions } from '@/widgets/dashboard/project-manager/lib/use-project-reference-options';

const FORM_ID = 'project-form';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Nullable<AdminProject>;
  onSubmit: (values: ProjectFromValues) => void;
  loading: boolean;
}

export function ProjectDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: ProjectDialogProps) {
  const t = useTranslations('dashboard.project');
  const { tagOptions, techOptions } = useProjectReferenceOptions(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the field area scrolls. `min-w-0` is load-bearing: without it the
          editor toolbar's button row sets the flex item's minimum width and
          widens the dialog past its own max-width. */}
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>
            {initialData ? t('dialog.editTitle') : t('dialog.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? t('dialog.editDescription')
              : t('dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <ProjectForm
            formId={FORM_ID}
            initialData={initialData ?? undefined}
            tagOptions={tagOptions}
            techOptions={techOptions}
            onSubmit={onSubmit}
          />
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
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? t('dialog.savingButton') : t('dialog.saveButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
