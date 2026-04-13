'use client';

// Error boundaries must be Client Components
import { useCallback, useEffect, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { Routes } from '@/shared/config/global';
import { cn, prettyStringify } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import GoBackButton from '@/shared/ui/go-back';
import { Icons } from '@/shared/ui/icons';

import { useClipboard } from '@mantine/hooks';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');
  const errorDetails = useMemo(
    () => ({
      errorMsg: error.message,
      digest: error.digest,
    }),
    [error]
  );

  const { copied, copy } = useClipboard({ timeout: 2000 });

  const handleCopyError = useCallback(() => {
    copy(prettyStringify(errorDetails));
  }, []);

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);
  return (
    <section className="container relative z-20 mx-auto flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full">
        <div className="mx-auto flex max-w-lg flex-col items-stretch gap-2 text-center md:items-center md:gap-4">
          <h1 className="scroll-m-20 text-balance text-center text-4xl font-extrabold tracking-tight">
            Error
          </h1>

          <h1 className="mt-2 text-xl font-bold text-gray-800 dark:text-white">
            {t('somethingWentWrong')}
          </h1>

          <div className="mt-2 flex flex-col flex-wrap gap-4 md:flex-row">
            <GoBackButton>{t('goBack')}</GoBackButton>
            <Link href={Routes.Homepage}>
              <Button
                variant="secondary"
                className={cn(
                  'w-full gap-1 py-3 text-lg md:w-auto md:py-2 md:text-base shadow-md'
                )}
              >
                <span>{t('home')}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-4 rounded-lg bg-gray-100 p-6 shadow-xl dark:bg-gray-900">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {t('errorDetails')}
          </h3>
          <div className="w-full rounded-md bg-gray-200 p-4 text-left dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Message:</strong> {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <strong>Digest:</strong> {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleCopyError}
            >
              <Icons.copy className="h-4 w-4" />
              {copied ? t('copied') : t('copyError')}
            </Button>

            <Link href={'mailto:lthphuw@gmail.com'} target="_blank">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleCopyError}
              >
                <Icons.report className="h-4 w-4" />
                {t('reportForMe')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
