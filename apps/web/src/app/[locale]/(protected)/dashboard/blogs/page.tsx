import type { Metadata } from 'next';

import { BlogManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Blog Management',
  description: 'Write, edit, and publish articles for your portfolio blog.',
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

export default async function BlogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
        <p className="text-lg text-muted-foreground">
          Create and manage your articles, drafts, and published content.
        </p>
      </div>

      <BlogManager />
    </div>
  );
}
