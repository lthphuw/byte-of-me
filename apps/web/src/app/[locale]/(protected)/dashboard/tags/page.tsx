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
      <TagManager />
    </div>
  );
}
