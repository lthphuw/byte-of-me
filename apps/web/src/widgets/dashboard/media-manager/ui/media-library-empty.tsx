'use client';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@byte-of-me/ui';

export function MediaLibraryEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No media found</EmptyTitle>
        <EmptyDescription>
          Your library is empty. Upload your first image to get started.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
