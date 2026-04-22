'use client';

import React from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { globalConfig,Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';





export function PublicSiteFooterNav() {
  const t = useTranslations('global.footer');
  const segment = useSelectedLayoutSegment();

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 md:items-start md:gap-6"
      aria-label={t('navigation')}
    >
      {globalConfig.footer.nav.map((item) => (
        <Link
          href={item.disabled ? '#' : item.href}
          className={cn(
            'font-medium hover:text-blue-400 items-center rounded-lg px-1 text-sm transition-colors',
            item.href.startsWith(`/${segment}`) ||
              (!segment && item.href === Routes.Homepage)
              ? 'text-foreground font-semibold'
              : 'text-foreground/60'
          )}
        >
          {t(item.title as Any)}
        </Link>
      ))}
    </nav>
  );
}
