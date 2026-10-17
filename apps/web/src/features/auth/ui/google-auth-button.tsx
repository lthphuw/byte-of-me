'use client';

import { useServerMutation } from '@byte-of-me/query';
import { Button, Icons } from '@byte-of-me/ui';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Imported by path, not from the `@/features/auth` root barrel: the barrel
// re-exports this very file, so going through it closes an import cycle.
import { logInToDashboardWithOAuth } from '@/features/auth/lib/log-in-to-dashboard-with-oauth';
import { logInWithGoogle } from '@/features/auth/lib/log-in-with-google';
import type { AuthButtonProps } from '@/features/auth/ui/auth-button-props';

export function GoogleAuthButton({
  className,
  callbackUrl,
  surface = 'public',
}: AuthButtonProps) {
  const t = useTranslations('auth');
  const pathname = usePathname();

  const signIn = useServerMutation<string, null>({
    mutationFn: (destination) =>
      surface === 'admin'
        ? logInToDashboardWithOAuth('google', destination)
        : logInWithGoogle(destination),
    errorMessage: t('signInFailed'),
  });

  return (
    <Button
      variant="outline"
      onClick={() => signIn.mutate(callbackUrl ?? pathname)}
      disabled={signIn.isPending}
      className={className}
    >
      <Icons.google className="mr-2 h-4 w-4" />
      {t('signInWithGoogle')}
    </Button>
  );
}
