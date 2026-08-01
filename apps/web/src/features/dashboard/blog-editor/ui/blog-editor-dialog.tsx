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
  Skeleton,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import { BlogForm } from './form/blog-form';

import type { AdminBlog } from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';

const FORM_ID = 'blog-editor-form';

export interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: BlogFormValues) => void;
  initialData: Nullable<AdminBlog>;
  /**
   * True while the full post (translations with `content` included) is
   * being fetched for an edit, or while that fetch has failed. The list row
   * that opened this dialog never carries `content` (see
   * `AdminBlogListItem`), so the form must stay unmounted until this
   * clears — mounting it on a partial row is exactly how a save would
   * overwrite real content with emptiness.
   */
  isLoadingInitialData?: boolean;
  /** Set when the full-post fetch failed; shown instead of the skeleton. */
  loadError?: Nullable<string>;
  onRetryLoad?: () => void;
  loading: boolean;
}

/** Placeholder shown while `getAdminBlogById` is in flight; mirrors the
 * form's rough shape (meta fields, then a tall content editor) so the dialog
 * doesn't jump size when the real form mounts. */
function BlogFormSkeleton() {
  const t = useTranslations('dashboard.blog');
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t('dialog.loadingLabel')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
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
  isLoadingInitialData = false,
  loadError,
  onRetryLoad,
  onSubmit,
  loading,
}: BlogEditorDialogProps) {
  const t = useTranslations('dashboard.blog');
  // Loading counts as "editing" even before the row has arrived — only the
  // "new post" path (no id at all) ever gets here without initialData set.
  const isEditing = Boolean(initialData) || isLoadingInitialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Same blueprint as the education dialog: fixed header/footer, only the
          field area scrolls. `min-w-0` on the body is load-bearing — the
          editor toolbar's ~990px min-content otherwise inflates the dialog
          sideways (the old `overflow-x-hidden` clipped that instead of
          fixing it). Near-full height: this is the heaviest authoring surface
          in the app, so the editor gets the room. */}
      <DialogContent className="flex h-[92vh] w-[calc(100vw-2rem)] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:w-full">
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
          {loadError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              {onRetryLoad && (
                <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
                  {t('dialog.retry')}
                </Button>
              )}
            </div>
          ) : isLoadingInitialData ? (
            <BlogFormSkeleton />
          ) : (
            <BlogForm
              formId={FORM_ID}
              initialData={initialData ?? undefined}
              onSubmit={onSubmit}
              loading={loading}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('dialog.cancelButton')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={loading || isLoadingInitialData || Boolean(loadError)}
          >
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? t('dialog.saveButton') : t('dialog.createSubmitButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
