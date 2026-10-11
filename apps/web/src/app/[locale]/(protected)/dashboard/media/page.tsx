import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getWorkspaceSettings } from '@/entities/workspace-settings/api/get-workspace-settings';
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

export default async function MediaPage() {
  // Imported by its own path rather than through `@/entities/workspace-settings`
  // — that barrel is client-reachable, and this is a plain server module that
  // value-imports prisma. Same reasoning as `dashboard/layout.tsx`.
  const settings = await getWorkspaceSettings();

  return (
    <div className="space-y-6">
      <MediaManager initialCompressionConfig={settings.imageCompression} />
    </div>
  );
}
