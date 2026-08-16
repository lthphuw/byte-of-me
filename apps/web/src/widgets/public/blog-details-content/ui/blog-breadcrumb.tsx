import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';

export async function BlogBreadcrumb({ title }: { title: string }) {
  const t = await getTranslations('blogDetails');

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
    >
      {/* The two labels never shrink and never wrap. Everything here was
          `flex-shrink: 1`, so a narrow viewport squeezed them down to their
          longest word and broke them across two lines — "Trang chủ" and "Tất cả
          bài viết" each became two rows while the title kept 261 of the 421px
          available. Vietnamese shows it first because its labels are longer
          than "Home" and "All posts", but English is the same shape.

          A `min-w-16` used to sit on the second link, which was an attempt at
          this; a min-width does not stop text wrapping inside the box. */}
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

      {/* `min-w-0` so the title is what gives way: a flex child defaults to
          `min-width: auto`, which is its longest word, and without this the
          truncation cannot take effect before the labels start being squeezed
          again. */}
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
