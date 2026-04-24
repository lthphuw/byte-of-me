'use client';

import { LayoutGrid, SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui';


export interface ProjectEmptyProps {
  isSearch?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

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
            <SearchX className="size-10 text-muted-foreground" />
          ) : (
            <LayoutGrid className="size-10 text-muted-foreground" />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-muted-foreground">
          {isSearch ? t('noProjectsMatchYourSearch') : t('noProjectsFound')}
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
