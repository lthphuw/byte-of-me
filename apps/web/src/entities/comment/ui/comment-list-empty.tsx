'use client';

import { MessageSquareOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CommentListEmpty() {
  const t = useTranslations('blogDetails');

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <MessageSquareOff className="mb-3 h-12 w-12 opacity-20" />
      <h4 className="font-medium text-foreground">{t('noCommentsYet')}</h4>
      <p className="text-sm">{t('beTheFirstComment')}</p>
    </div>
  );
}
