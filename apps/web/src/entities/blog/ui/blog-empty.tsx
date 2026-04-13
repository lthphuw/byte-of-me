'use client';

import { LibraryBig, SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';

export interface BlogEmptyProps {
  isSearch?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function BlogEmpty({ isSearch, className, style }: BlogEmptyProps) {
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
