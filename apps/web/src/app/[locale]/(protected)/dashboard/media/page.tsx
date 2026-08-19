import type { Metadata } from 'next';

import { MediaManager } from '@/widgets/dashboard/media-manager';





export const metadata: Metadata = {
  title: 'Media Library',
  description: 'Upload and organize your images, banners, and assets.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function MediaPage() {
  return (
    <div className="space-y-6">
      <MediaManager />
    </div>
  );
}
