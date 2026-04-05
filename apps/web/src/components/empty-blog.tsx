'use client';

import { FolderCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

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
