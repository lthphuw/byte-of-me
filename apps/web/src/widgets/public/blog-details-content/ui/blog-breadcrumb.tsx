import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Routes } from '@/shared/config/global';
import { Link } from '@/shared/i18n/navigation';

export async function BlogBreadcrumb({ title }: { title: string }) {
  const t = await getTranslations('blogDetails');

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link href="/" className="transition-colors hover:text-foreground">
        {t('home')}
      </Link>

      <ChevronRight className="h-3.5 w-3.5 shrink-0" />

      <Link
        href={Routes.Blogs}
        className="transition-colors hover:text-foreground min-w-16"
      >
        {t('allPosts')}
      </Link>

      <ChevronRight className="h-3.5 w-3.5 shrink-0" />

      <span className="line-clamp-1 text-foreground" aria-current="page">
        {title}
      </span>
    </nav>
  );
}
