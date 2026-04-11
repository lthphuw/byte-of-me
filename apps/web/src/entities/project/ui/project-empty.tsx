'use client';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';
import { FolderCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ProjectEmtpyProps = BaseComponentProps & {
  message?: string;
};

export function ProjectEmpty({ message, className, style }: ProjectEmtpyProps) {
  const t = useTranslations();

  return (
    <Empty className={className} style={style}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderCode />
        </EmptyMedia>
        <EmptyTitle>{message ?? t('project.thereAreNoProjectsYet')}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
