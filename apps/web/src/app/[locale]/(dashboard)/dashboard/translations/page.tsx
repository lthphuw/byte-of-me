import { prisma } from '@db/client';

import { getCurrentUser } from '@/lib/session';
import { TranslationManager } from '@/components/translation-manager';





export const metadata = { title: 'Translations' };

export default async function TranslationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const translations = await prisma.translation.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Translations</h1>
          <p className="text-muted-foreground">Manage system translations</p>
        </div>
      </div>

      <TranslationManager initialTranslations={translations} />
    </div>
  );
}
