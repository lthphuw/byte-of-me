'use client';

import { Button , Icons } from '@byte-of-me/ui';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { logInToDashboardWithOAuth } from '@/features/auth/lib/log-in-to-dashboard-with-oauth';
import { logInWithGithub } from '@/features/auth/lib/log-in-with-github';
import type { AuthButtonProps } from '@/features/auth/ui/auth-button-props';

export function GithubAuthButton({
  className,
  callbackUrl,
  surface = 'public',
}: AuthButtonProps) {
  const t = useTranslations('auth');
  const pathname = usePathname();

  const handleLogin = async () => {
    const destination = callbackUrl ?? pathname;

    if (surface === 'admin') {
      await logInToDashboardWithOAuth('github', destination);
      return;
    }

    await logInWithGithub(destination);
  };

  return (
    <Button variant="outline" onClick={handleLogin} className={className}>
      <Icons.github className="mr-2 h-4 w-4" />
      {t('signInWithGithub')}
    </Button>
  );
}
