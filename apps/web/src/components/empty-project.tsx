'use client';

import { FolderCode } from 'lucide-react';

import { useTranslations } from '@/hooks/use-translations';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';





export type EmptyProjectProps = BaseComponentProps;

export function EmptyProject({ className, style }: EmptyProjectProps) {
  const t = useTranslations();
  return (
    <Empty className={className} style={style}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderCode />
        </EmptyMedia>
        <EmptyTitle>{t('project.thereAreNoProjectsYet')}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
