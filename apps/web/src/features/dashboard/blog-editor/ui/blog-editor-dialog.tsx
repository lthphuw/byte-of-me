'use client';

import { useEffect, useState } from 'react';
import type { BlogFormValues } from '@byte-of-me/contracts/blog';
import { Skeleton } from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { BlogForm } from './form/blog-form';

import type { AdminBlog } from '@/entities/blog';
import { EditRecordDialog, type EditRecordDialogControls } from '@/shared/ui';

const FORM_ID = 'blog-editor-form';

interface BlogEditorDialogProps extends EditRecordDialogControls {
  /** The full post, translations with `content` included. `null` for a new post. */
  initialData: Nullable<AdminBlog>;
  onSubmit: (values: BlogFormValues, options: { onSaved: () => void }) => void;
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
  initialData,
  onSubmit,
  ...controls
}: BlogEditorDialogProps) {
  const t = useTranslations('dashboard.blog');
  const [isDirty, setIsDirty] = useState(false);

  // The form holding the changes unmounts with the dialog, so a closed dialog
  // has none. Without this, a reopened edit could ask about changes it never had.
  useEffect(() => {
    if (!controls.open) setIsDirty(false);
  }, [controls.open]);

  return (
    <EditRecordDialog
      {...controls}
      entity={t('entity')}
      size="xl"
      formId={FORM_ID}
      isDirty={isDirty}
      hasRecord={Boolean(initialData)}
      skeleton={<BlogFormSkeleton />}
    >
      <BlogForm
        formId={FORM_ID}
        initialData={initialData ?? undefined}
        onSubmit={onSubmit}
        onDirtyChange={setIsDirty}
      />
    </EditRecordDialog>
  );
}
