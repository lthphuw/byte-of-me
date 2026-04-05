'use client';

import { BlogDetails } from '@/lib/actions/dashboard/blog/get-paginated-blogs';
import { BlogFormValues } from '@/lib/schemas/blog.schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { BlogForm } from './blog-form';

export interface BlogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: BlogFormValues) => void;
  initialData: BlogDetails;
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Blog' : 'Create Blog'}</DialogTitle>
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
