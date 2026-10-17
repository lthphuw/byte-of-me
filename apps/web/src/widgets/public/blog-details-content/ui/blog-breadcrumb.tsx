import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';

export async function BlogBreadcrumb({ title }: { title: string }) {
  const t = await getTranslations('blogDetails');

  return (
    <nav
      aria-label={t('breadcrumb')}
      className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
    >
      {/* The labels never shrink or wrap: at `flex-shrink: 1` a narrow viewport broke "Trang chủ"
          and "Tất cả bài viết" across two rows while the title kept 261 of 421px. */}
      <Link
        href="/"
        className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground"
      >
        {t('home')}
      </Link>

      <ChevronRight className="h-3.5 w-3.5 shrink-0" />

      <Link
        href={Routes.Blogs}
        className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground"
      >
        {t('allPosts')}
      </Link>

      <ChevronRight className="h-3.5 w-3.5 shrink-0" />

      {/* `min-w-0` so the title gives way: a flex child's default `min-width: auto` is its longest
          word, so truncation could not take effect before the labels got squeezed again. */}
      <span
        className="min-w-0 truncate text-foreground"
        aria-current="page"
        title={title}
      >
        {title}
      </span>
    </nav>
  );
}
