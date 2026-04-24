'use client';

import { Empty, EmptyDescription, EmptyHeader } from '@/shared/ui';

export function MediaLibraryEmpty() {
  return (
    <Empty>
      <EmptyHeader>No media found</EmptyHeader>
      <EmptyDescription>
        Your library is empty. Upload your first image to get started.
      </EmptyDescription>
    </Empty>
  );
}
