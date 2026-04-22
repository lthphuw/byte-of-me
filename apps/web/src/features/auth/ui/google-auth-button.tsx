'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { logInWithGoogle } from '@/features/auth';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';

export function GoogleAuthButton({ className }: { className?: string }) {
  const t = useTranslations('auth');
  const pathname = usePathname();

  const handleLogin = async () => {
    await logInWithGoogle(pathname);
  };

  return (
    <Button variant="outline" onClick={handleLogin} className={className}>
      <Icons.google className="mr-2 h-4 w-4" />
      {t('signInWithGoogle')}
    </Button>
  );
}
