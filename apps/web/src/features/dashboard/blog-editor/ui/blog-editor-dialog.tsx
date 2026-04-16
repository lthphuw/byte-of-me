'use client';

import { BlogForm } from './form/blog-form';

import type { AdminBlog } from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: BlogFormValues) => void;
  initialData: AdminBlog;
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
          initialData={initialData}
          onSubmit={onSubmit}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}
