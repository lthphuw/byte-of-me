import type { Metadata } from 'next';

import { NoteManager } from '@/widgets/dashboard';

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Private notes. Never published.',
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

export default async function NotesPage() {
  return (
    <div className="space-y-6">
      <NoteManager />
    </div>
  );
}
