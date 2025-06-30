'use client';

// Error boundaries must be Client Components
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo } from 'react';

import { FuzzyError } from '@/components/fuzzy-error';
import GoBackButton from '@/components/go-back';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn, prettyStringify } from '@/lib/utils';

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
    <section className="relative container flex items-center justify-center min-h-screen px-6 py-12 mx-auto z-20">
      <div className="w-full">
        <div className="flex flex-col gap-2 md:gap-4 items-stretch md:items-center max-w-lg mx-auto text-center">
          <FuzzyError />
          <h1 className="mt-2 text-xl font-bold text-gray-800 dark:text-white">
            {t('Something went wrong!')}
          </h1>

          <div className="flex flex-col flex-wrap gap-4 mt-2 md:flex-row">
            <GoBackButton>{t('Go back')}</GoBackButton>
            <Link href="/">
              <Button
                variant="secondary"
                className={cn(
                  'w-full gap-1 py-3 text-lg md:w-auto md:py-2 md:text-base shadow-md'
                )}
              >
                <span>{t('Home')}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center w-full max-w-2xl gap-4 mx-auto mt-8 p-6 rounded-lg shadow-xl bg-gray-100 dark:bg-gray-900">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {t('Error Details')}
          </h3>
          <div className="w-full text-left p-4 bg-gray-200 dark:bg-gray-800 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Message:</strong> {error.message}
            </p>
            {error.digest && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
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
              <Icons.copy className="w-4 h-4" />
              {copied ? t('Copied!') : t('Copy Error')}
            </Button>

            <Link href={'mailto:lthphuw@gmail.com'} target="_blank">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleCopyError}
              >
                <Icons.report className="w-4 h-4" />
                {t('Report for me')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
