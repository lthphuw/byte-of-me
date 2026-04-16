import { TagManager } from '@/widgets/dashboard';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tags | Dashboard',
  description: 'Organize and manage tags for projects and blog posts.',
  robots: { index: false },
};

export default async function TagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
        <p className="text-muted-foreground text-lg">
          Create and manage custom taxonomies to categorize your content.
        </p>
      </div>

      <TagManager />
    </div>
  );
}
