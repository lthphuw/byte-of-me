'use client';

import { m } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  GithubAuthButton,
  GoogleAuthButton,
  InviteAuthForm,
} from '@/features/auth/ui';
import { BrandMark } from '@/shared/ui/brand-mark';

/**
 * The share recipient's sign-in screen.
 *
 * Its own widget, not a mode of `AdminAuthLogInView`. That one renders the
 * `-admin` OAuth twins, which the `signIn` callback in `auth.ts` refuses for
 * anyone but the site owner — a recipient clicking them would be bounced with
 * `?error=AccessDenied` and no way to tell why. The buttons here are the
 * BARE `github` / `google` providers, the same pair the public comment modal
 * uses, which admit everyone.
 */
export function InviteLogInView() {
  const t = useTranslations('share.invite');
  const searchParams = useSearchParams();

  // The note the invitation actually named. `(shared)/layout.tsx` puts it here
  // when it turns an unauthenticated visitor away, so signing in returns them
  // to that note rather than to a generic inbox.
  const from = searchParams?.get('from') ?? undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]"
      >
        <div className="flex flex-col space-y-2 text-center">
          <BrandMark className="mx-auto mb-2 h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        <InviteAuthForm />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('orContinueWith')}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {/* `surface` left at its default, `public` — see the note above on
              why the admin twins are wrong here. */}
          <GithubAuthButton callbackUrl={from} />
          <GoogleAuthButton callbackUrl={from} />
        </div>
      </m.div>
    </div>
  );
}
