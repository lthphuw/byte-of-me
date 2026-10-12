import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAllAdminTechStack } from '@/entities/tech-stack';
import { TechStackManager } from '@/widgets/dashboard/tech-stack-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.dashboard.techStacks');

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

export default async function TechStackPage() {
  // The seed is only a head start. When this read fails, the manager loads the
  // list itself and shows its own skeleton, error and retry.
  const resp = await getAllAdminTechStack();

  return (
    <div className="space-y-6">
      <TechStackManager
        initialTechStacks={resp.success ? resp.data : undefined}
      />
    </div>
  );
}
