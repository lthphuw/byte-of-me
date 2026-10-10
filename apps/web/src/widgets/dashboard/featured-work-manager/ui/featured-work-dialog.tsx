'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icons,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { FeaturedWorkForm } from './featured-work-form';

import type { AdminFeaturedWork } from '@/entities/featured-work';
import type { FeaturedWorkFormValues } from '@/entities/featured-work/model/featured-work-schema';

const FORM_ID = 'featured-work-form';

interface FeaturedWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The list row being edited; absent for "new". It carries every field. */
  initialData?: Nullable<AdminFeaturedWork>;
  onSubmit: (data: FeaturedWorkFormValues) => void;
  loading?: boolean;
}

export function FeaturedWorkDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: FeaturedWorkDialogProps) {
  const t = useTranslations('dashboard.featuredWorks');
  const isEditing = Boolean(initialData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
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
          <FeaturedWorkForm
            formId={FORM_ID}
            initialData={initialData ?? undefined}
            onSubmit={onSubmit}
          />
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('dialog.cancelButton')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={loading}>
            {loading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? t('dialog.saveButton') : t('dialog.createSubmitButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
