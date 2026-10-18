import React from 'react';
import { Icons } from '@byte-of-me/ui';
import { getTranslations } from 'next-intl/server';

import { getPublicInfoForFooter } from '@/features/public/public-site-footer/lib';
import { PublicSiteFooterNav } from '@/features/public/public-site-footer/ui/public-site-footer-nav';
import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn, ensureValidUrl } from '@/shared/lib/utils';
import { SectionLoadError } from '@/shared/ui';
import { BrandMark } from '@/shared/ui/brand-mark';

type SiteFooterProps = React.HTMLAttributes<HTMLElement>;

export async function PublicSiteFooter({ className }: SiteFooterProps) {
  const [t, tError, resp] = await Promise.all([
    getTranslations('global.footer'),
    getTranslations('components.sectionLoadError'),
    getPublicInfoForFooter(),
  ]);
  if (!resp.success) {
    return (
      <footer className={cn('py-6 relative z-20', className)}>
        <SectionLoadError
          title={tError('title')}
          description={tError('description')}
        />
      </footer>
    );
  }

  const { email, displayName, socialLinks } = resp.data;

  const githubLink = socialLinks.find((it) => it.platform === 'github');
  const linkedInLink = socialLinks.find((it) => it.platform === 'linkedIn');

  return (
    <footer className={cn('py-6 relative z-20', className)}>
      <div className="container mx-auto flex max-w-[100%] flex-col items-center justify-between gap-4 px-0 md:flex-row md:gap-10 md:px-12">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link
            href={Routes.Homepage}
            aria-label={t('home')}
            className="relative touch-target"
          >
            <BrandMark />
          </Link>

          <h2 className="flex gap-1 text-center text-sm md:text-left">
            <span className="hidden md:inline-block">{t('builtBy')}</span>
            <a
              href={`mailto:${email}`}
              className="relative font-medium underline underline-offset-4 transition-colors touch-target hover:text-primary"
            >
              {displayName || email}
            </a>
          </h2>
        </div>

        <PublicSiteFooterNav />

        <div className="flex flex-col items-center gap-2 md:items-end">
          <div className="flex gap-2">
            {githubLink && (
              <a
                href={ensureValidUrl(githubLink.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="relative flex size-6 items-center justify-center transition-colors touch-target hover:text-primary"
              >
                <Icons.github size={20} />
              </a>
            )}

            {linkedInLink && (
              <a
                href={ensureValidUrl(linkedInLink.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="relative flex size-6 items-center justify-center transition-colors touch-target hover:text-primary"
              >
                <Icons.linkedin size={20} />
              </a>
            )}

            <a
              href={`mailto:${email}`}
              aria-label={t('email')}
              className="relative flex size-6 items-center justify-center transition-colors touch-target hover:text-primary"
            >
              <Icons.email size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
