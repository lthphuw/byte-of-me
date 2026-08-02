'use client';

import { buttonVariants, Icons } from '@byte-of-me/ui';
import { m } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import {
  AdminAuthForm,
  GithubAuthButton,
  GoogleAuthButton,
} from '@/features/auth/ui';
import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

export function AdminAuthLogInView() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();

  // Where the visitor was heading before the guard turned them away. Forwarded
  // to every provider so sign-in returns them there instead of always landing
  // on the dashboard — `/notes` is the case that made this visible.
  const from = searchParams?.get('from') ?? undefined;

  // Auth.js redirects back here with `?error=` when the `signIn` callback
  // refuses a sign-in. Without surfacing it, a refused account simply reappears
  // on this page with no explanation.
  const error = searchParams?.get('error');
  const errorMessage = error
    ? t(error === 'AccessDenied' ? 'accessDenied' : 'signInFailed')
    : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <m.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute left-4 top-4 md:left-8 md:top-8"
      >
        <Link
          href={Routes.Homepage}
          className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2')}
        >
          <Icons.chevronLeft className="h-4 w-4" />
          Back
        </Link>
      </m.div>

      {/* Center Card */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]"
      >
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto mb-2 h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <AdminAuthForm />

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
          <GithubAuthButton surface="admin" callbackUrl={from} />
          <GoogleAuthButton surface="admin" callbackUrl={from} />
        </div>
      </m.div>
    </div>
  );
}
