import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Translations | Dashboard',
  description: 'Manage multi-language content and localizations.',
  robots: { index: false },
};

export default async function TranslationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Translations</h1>
        <p className="text-muted-foreground text-lg">
          Configure and manage localized strings for your portfolio.
        </p>
      </div>
    </div>
  );
}
