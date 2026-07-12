'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@byte-of-me/ui';

import { BlogForm } from './form/blog-form';

import type { AdminBlog } from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';

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
      <DialogContent className="max-h-[80vh] max-w-[1300px] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Blog' : 'Create Blog'}
          </DialogTitle>
        </DialogHeader>

        <BlogForm
          initialData={initialData ?? undefined}
          onSubmit={onSubmit}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}
