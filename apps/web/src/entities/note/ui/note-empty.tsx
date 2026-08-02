'use client';

import {
  Button,
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@byte-of-me/ui';
import { NotebookText } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface NoteEmptyProps {
  onCreate: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function NoteEmpty({ onCreate, className, style }: NoteEmptyProps) {
  const t = useTranslations('dashboard.note');

  return (
    <Empty className={className} style={style}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <NotebookText className="size-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle className="text-muted-foreground">
          {t('empty.title')}
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" size="sm" onClick={onCreate}>
          {t('actions.create')}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
