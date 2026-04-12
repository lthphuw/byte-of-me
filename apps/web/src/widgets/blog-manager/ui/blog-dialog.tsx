'use client';

import type { AdminBlog } from '@/entities/blog';
import type { BlogFormValues } from '@/entities/blog/schemas/blog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

import { BlogForm } from './blog-form';

export interface BlogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: BlogFormValues) => void;
  initialData: AdminBlog;
  loading: boolean;
}

export function BlogDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: BlogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit PublicBlog' : 'Create PublicBlog'}</DialogTitle>
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
