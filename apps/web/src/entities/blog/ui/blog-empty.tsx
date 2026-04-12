'use client';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';
import { LibraryBig, SearchX } from 'lucide-react';
// Better icons
import { useTranslations } from 'next-intl';

export type EmptyBlogProps = BaseComponentProps & {
  isSearch?: boolean;
};

export function BlogEmpty({ isSearch, className, style }: EmptyBlogProps) {
  const t = useTranslations('blog');
  return (
    <Empty className={className} style={style}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isSearch ? <SearchX size={40} /> : <LibraryBig size={40} />}
        </EmptyMedia>
        <EmptyTitle>
          {isSearch ? t('noBlogsMatchYourSearch') : t('noBlogsFound')}
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
