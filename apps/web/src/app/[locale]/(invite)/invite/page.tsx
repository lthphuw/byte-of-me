import type { Metadata } from 'next';

import { InviteLogInView } from '@/widgets/auth/invite-log-in-view';

export const metadata: Metadata = {
  title: 'Open a shared note',
  description: 'Sign in to open a note that was shared with you.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function InvitePage() {
  return <InviteLogInView />;
}
