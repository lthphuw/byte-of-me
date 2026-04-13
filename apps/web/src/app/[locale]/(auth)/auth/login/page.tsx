import type { Metadata } from 'next';

import { AuthLogInView } from '@/widgets/auth/auth-log-in-view/ui';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPage() {
  return <AuthLogInView />;
}
