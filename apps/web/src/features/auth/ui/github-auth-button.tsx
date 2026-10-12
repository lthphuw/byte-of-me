'use client';

import { Button, Icons } from '@byte-of-me/ui';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { logInToDashboardWithOAuth } from '@/features/auth/lib/log-in-to-dashboard-with-oauth';
import { logInWithGithub } from '@/features/auth/lib/log-in-with-github';
import type { AuthButtonProps } from '@/features/auth/ui/auth-button-props';
import { useServerMutation } from '@/shared/hooks/use-server-mutation';

export function GithubAuthButton({
  className,
  callbackUrl,
  surface = 'public',
}: AuthButtonProps) {
  const t = useTranslations('auth');
  const pathname = usePathname();

  const signIn = useServerMutation<string, null>({
    mutationFn: (destination) =>
      surface === 'admin'
        ? logInToDashboardWithOAuth('github', destination)
        : logInWithGithub(destination),
    errorMessage: t('signInFailed'),
  });

  return (
    <Button
      variant="outline"
      onClick={() => signIn.mutate(callbackUrl ?? pathname)}
      disabled={signIn.isPending}
      className={className}
    >
      <Icons.github className="mr-2 h-4 w-4" />
      {t('signInWithGithub')}
    </Button>
  );
}
