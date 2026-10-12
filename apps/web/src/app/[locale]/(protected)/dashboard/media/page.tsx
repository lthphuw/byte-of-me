import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MediaManager } from '@/widgets/dashboard/media-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.media');

  return {
    title: t('title'),
    description: t('description'),
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
}

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <MediaManager />
    </div>
  );
}
