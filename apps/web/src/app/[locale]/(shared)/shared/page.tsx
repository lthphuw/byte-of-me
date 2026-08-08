import type { Metadata } from 'next';

import { SharedInboxView } from '@/widgets/shared/shared-note-workspace';

export const metadata: Metadata = {
  title: 'Shared with you',
  description: 'Notes other people have shared with you.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function SharedInboxPage() {
  return <SharedInboxView />;
}
