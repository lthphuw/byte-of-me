import { MediaManager } from '@/widgets/dashboard';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Library | Dashboard',
  description: 'Upload and organize your images, banners, and assets.',
  robots: { index: false },
};

export default async function MediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
        <p className="text-muted-foreground text-lg">
          Centralized storage for your portfolio assets and banner images.
        </p>
      </div>

      <MediaManager />
    </div>
  );
}
