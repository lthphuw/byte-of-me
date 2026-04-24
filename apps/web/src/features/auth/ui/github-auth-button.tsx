'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { logInWithGithub } from '@/features/auth/lib/log-in-with-github';
import { Button , Icons } from '@/shared/ui';





export function GithubAuthButton({ className }: { className?: string }) {
  const t = useTranslations('auth');
  const pathname = usePathname();

  const handleLogin = async () => {
    await logInWithGithub(pathname);
  };

  return (
    <Button variant="outline" onClick={handleLogin} className={className}>
      <Icons.github className="mr-2 h-4 w-4" />
      {t('signInWithGithub')}
    </Button>
  );
}
