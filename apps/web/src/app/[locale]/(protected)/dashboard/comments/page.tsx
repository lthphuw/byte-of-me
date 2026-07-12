import type { Metadata } from 'next';

import { CommentManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Comments',
  description: 'Moderate comments on your blogs and projects.',
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

export default async function CommentsPage() {
  return (
    <div className="space-y-6">
      <CommentManager />
    </div>
  );
}
