import type { Metadata } from 'next';

import { TagManager } from '@/widgets/dashboard';





export const metadata: Metadata = {
  title: 'Tags',
  description: 'Organize and manage tags for projects and blog posts.',
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

export default async function TagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
        <p className="text-lg text-muted-foreground">
          Create and manage custom taxonomies to categorize your content.
        </p>
      </div>

      <TagManager />
    </div>
  );
}
