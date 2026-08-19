import type { Metadata } from 'next';

import { BlogManager } from '@/widgets/dashboard/blog-manager';

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
      <BlogManager />
    </div>
  );
}
