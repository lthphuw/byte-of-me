import type { Metadata } from 'next';

import { TranslationManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Translations',
  description: 'Manage multi-language content and localizations.',
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

export default async function TranslationsPage() {
  return (
    <div className="space-y-6">
      <TranslationManager />
    </div>
  );
}
