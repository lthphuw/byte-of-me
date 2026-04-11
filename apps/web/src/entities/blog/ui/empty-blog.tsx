'use client';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';
import { FolderCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type EmptyBlogProps = BaseComponentProps & {
  message?: string;
};

export function EmptyBlog({ message, className, style }: EmptyBlogProps) {
  const t = useTranslations();
  return (
    <Empty className={className} style={style}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderCode />
        </EmptyMedia>
        <EmptyTitle>{message ?? t('blog.noBlogsMatchYourSearch')}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
