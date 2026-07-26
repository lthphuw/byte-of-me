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

import { BlogForm } from './form/blog-form';

import type { AdminBlog } from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';

const FORM_ID = 'blog-editor-form';

export interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: BlogFormValues) => void;
  initialData: Nullable<AdminBlog>;
  loading: boolean;
}

export function BlogEditorDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: BlogEditorDialogProps) {
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
          <DialogTitle>{initialData ? 'Edit blog' : 'Create blog'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the post and its translations, then save.'
              : 'Write the post, add translations, and publish when ready.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <BlogForm
            formId={FORM_ID}
            initialData={initialData ?? undefined}
            onSubmit={onSubmit}
            loading={loading}
          />
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={loading}>
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Save changes' : 'Create post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
