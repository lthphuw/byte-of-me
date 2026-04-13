import { AuthLogInView } from '@/widgets/auth/auth-log-in-view/ui';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPage() {
  return <AuthLogInView />;
}
