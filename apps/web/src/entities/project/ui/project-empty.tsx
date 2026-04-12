'use client';

import { LayoutGrid, SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';

export type ProjectEmptyProps = BaseComponentProps & {
  isSearch?: boolean;
};

export function ProjectEmpty({
  isSearch,
  className,
  style,
}: ProjectEmptyProps) {
  const t = useTranslations('project');

  return (
    <Empty className={className} style={style}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isSearch ? (
            <SearchX className="text-muted-foreground size-10" />
          ) : (
            <LayoutGrid className="text-muted-foreground size-10" />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-muted-foreground">
          {isSearch ? t('noProjectsMatchYourSearch') : t('noProjectsFound')}
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
