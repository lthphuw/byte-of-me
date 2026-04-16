import { AuthLogInView } from '@/widgets/auth/auth-log-in-view/ui';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Byte of Me',
  description:
    'Secure access to the Byte of Me dashboard to manage blogs, projects, and site analytics.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: 'Login | Byte of Me',
    description: 'Admin gateway for the Byte of Me CMS.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Login | Byte of Me',
    description: 'Admin gateway for the Byte of Me CMS.',
  },
};

export default function LoginPage() {
  return <AuthLogInView />;
}
