'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { logInWithGitHub } from '@/features/auth/lib/login-with-github';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';





export function GithubAuthButton({ className }: { className?: string }) {
  const t = useTranslations('auth');
  const pathname = usePathname();

  const handleLogin = async () => {
    await logInWithGitHub(pathname);
  };

  return (
    <Button variant="outline" onClick={handleLogin} className={className}>
      <Icons.github className="mr-2 h-4 w-4" />
      {t('signInWithGithub')}
    </Button>
  );
}
