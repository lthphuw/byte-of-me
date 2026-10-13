'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { BlogForm } from './form/blog-form';

import type { AdminBlog } from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import { RecordDialog } from '@/shared/ui';
import { EditRecordGate } from '@/shared/ui/edit-record-gate';

const FORM_ID = 'blog-editor-form';

export interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The full post, translations with `content` included. `null` for a new post. */
  initialData: Nullable<AdminBlog>;
  /** The full post is loading or was never requested, so the form must not mount yet. */
  isNotReady: boolean;
  hasError: boolean;
  onRetry: () => void;
  isPending: boolean;
  onSubmit: (values: BlogFormValues) => void;
}

/** Stands in for the form while the post loads. Its editor is the editor's `h-64` minimum. */
function BlogFormSkeleton() {
  const t = useTranslations('dashboard.blog');

  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label={t('dialog.loadingLabel')}
    >
      {/* Same two columns and gap as BlogMetaFields */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function BlogEditorDialog({
  open,
  onOpenChange,
  initialData,
  isNotReady,
  hasError,
  onRetry,
  isPending,
  onSubmit,
}: BlogEditorDialogProps) {
  const t = useTranslations('dashboard.blog');
  const crud = useTranslations('dashboard.shared.crud');
  const [isDirty, setIsDirty] = useState(false);

  // The form holding the changes unmounts with the dialog, so a closed dialog
  // has none. Without this, a reopened edit could ask about changes it never had.
  useEffect(() => {
    if (!open) setIsDirty(false);
  }, [open]);

  // Loading counts as editing before the record arrives: only "new" has neither.
  const isEditing = Boolean(initialData) || isNotReady;
  const entity = t('entity');

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing ? crud('editTitle', { entity }) : crud('newTitle', { entity })
      }
      size="xl"
      formId={FORM_ID}
      isPending={isPending}
      isDirty={isDirty}
    >
      <EditRecordGate
        isNotReady={isNotReady}
        hasError={hasError}
        onRetry={onRetry}
        skeleton={<BlogFormSkeleton />}
      >
        <BlogForm
          formId={FORM_ID}
          initialData={initialData ?? undefined}
          onSubmit={onSubmit}
          onDirtyChange={setIsDirty}
        />
      </EditRecordGate>
    </RecordDialog>
  );
}
