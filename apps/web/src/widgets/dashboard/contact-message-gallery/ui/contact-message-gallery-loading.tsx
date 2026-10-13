import { Skeleton } from '@byte-of-me/ui';

import { ContactMessageGridSkeleton } from './contact-message-grid-skeleton';

/**
 * The gallery's route loading state: its header, search and cards, with the
 * gallery's own spacing and line heights, so the block does not move on load.
 */
export function ContactMessageGalleryLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="border-b pb-4">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-md rounded-xl" />
      <ContactMessageGridSkeleton />
    </div>
  );
}
